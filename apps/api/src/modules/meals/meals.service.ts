import { Inject, Injectable } from "@nestjs/common";
import type {
  ConfirmMealInput,
  CreateMealInput,
  LogItemsInput,
  MealTypeValue,
  ParseItemsInput,
  QuickAddInput,
  RecheckInput,
  UploadUrlInput,
} from "@fitr8/contracts";
import { parseDateOnly } from "@fitr8/domain/dates";
import { sumMacros } from "@fitr8/domain/nutrition";
import type { MealLogStatus } from "@fitr8/db";
import { AppError, notFound } from "../../common/errors.js";
import { visibleFoodTo } from "../foods/food-visibility.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { JobQueue, type EnqueueResult } from "../../infra/queue/job-queue.service.js";
import { StorageService } from "../../infra/storage/storage.service.js";
import { FOOD_EXTRACTOR, type FoodExtractor } from "../ai/index.js";
import { UsersService } from "../users/users.service.js";
import { MEAL_ANALYSIS_QUEUE, type MealAnalysisData } from "./meal-analysis.job.js";
import { MealItemsService, PRICING_SELECT, type BuiltItem } from "./meal-items.service.js";
import { ScanQuotaService } from "./scan-quota.service.js";
import { UsualsService } from "./usuals.service.js";

/** What a create/recheck responds with: the status code depends on whether analysis ran inline. */
export interface StatusResult<T> {
  status: number;
  body: T;
}

type CreatedMeal = { id: string; status: MealLogStatus };

/** A meal as the coach sees a draft: what was found, the amounts and the numbers. */
const MEAL_DRAFT_SELECT = {
  id: true,
  date: true,
  mealType: true,
  source: true,
  inputText: true,
  status: true,
  aiNotes: true,
  error: true,
  totalKcal: true,
  totalProtein: true,
  totalCarbs: true,
  totalFat: true,
  items: {
    select: {
      name: true,
      quantity: true,
      unit: true,
      grams: true,
      kcal: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      approximate: true,
    },
  },
} as const;

/** GET /meals/:id: what the review screen reads (polled every second while analysing). */
const MEAL_DETAIL_SELECT = {
  id: true,
  date: true,
  mealType: true,
  source: true,
  inputText: true,
  status: true,
  photoKey: true,
  aiRaw: true,
  aiNotes: true,
  note: true,
  error: true,
  totalKcal: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      foodId: true,
      name: true,
      quantity: true,
      unit: true,
      grams: true,
      kcal: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      aiConfidence: true,
      approximate: true,
      edited: true,
      isLiquid: true,
    },
  },
} as const;

/** Clients read only `hiddenFatLikely` from the model's output (it turns the ghee switch on). */
function aiHints(raw: unknown): { hiddenFatLikely?: boolean } | null {
  if (!raw || typeof raw !== "object") return null;
  const hidden = (raw as { hiddenFatLikely?: unknown }).hiddenFatLikely;
  return typeof hidden === "boolean" ? { hiddenFatLikely: hidden } : {};
}

/** Meal logging: photo/text/manual meals, AI analysis hand-off, confirmation, and no-AI quick logs. */
@Injectable()
export class MealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobQueue,
    private readonly storage: StorageService,
    private readonly users: UsersService,
    private readonly items: MealItemsService,
    private readonly quota: ScanQuotaService,
    private readonly usuals: UsualsService,
    @Inject(FOOD_EXTRACTOR) private readonly extractor: FoodExtractor,
  ) {}

  /** Step 1 of photo logging: a signed URL the client PUTs the (compressed) image to. */
  async uploadUrl(userId: string, { contentType }: UploadUrlInput) {
    const key = this.storage.mealPhotoKey(userId, contentType);
    const uploadUrl = await this.storage.presignUpload(key, contentType);
    return { key, uploadUrl, expiresIn: 300 };
  }

  /**
   * Step 2: create a meal log from a photo key or text, then analyse it (queued, or inline without Redis).
   * MANUAL creates an empty READY log with no AI call, for the user to fill in.
   * Queued → 202 `{ id, status: "PENDING" }` (poll GET /meals/:id); inline → 201 `{ id, status }`.
   */
  async create(userId: string, input: CreateMealInput): Promise<StatusResult<CreatedMeal>> {
    const select = { id: true, status: true } as const;
    if (input.source === "PHOTO" && !input.photoKey.startsWith(`meals/${userId}/`)) {
      throw new AppError(403, "Photo does not belong to you");
    }
    // Photos use a daily scan; typed meals are free (design 9c). Checked alongside the date lookup.
    const [date] = await Promise.all([
      this.users.mealDate(userId, input.date),
      input.source === "PHOTO" ? this.quota.assertCanScanPhoto(userId) : null,
      input.source === "TEXT" ? this.quota.assertWithinTextCap(userId) : null,
    ]);

    if (input.source === "MANUAL") {
      const log = await this.prisma.mealLog.create({
        data: { userId, date, mealType: input.mealType, source: "TEXT", status: "READY" },
        select,
      });
      return { status: 201, body: log };
    }

    const log = await this.prisma.mealLog.create({
      data: {
        userId,
        date,
        mealType: input.mealType,
        source: input.source,
        photoKey: input.source === "PHOTO" ? input.photoKey : null,
        inputText: input.source === "TEXT" ? input.text : null,
      },
      select: { id: true },
    });

    if ((await this.analyze(log.id, log.id)) === "queued") {
      return { status: 202, body: { id: log.id, status: "PENDING" as const } };
    }
    const result = await this.prisma.mealLog.findUnique({ where: { id: log.id }, select });
    return { status: 201, body: result! }; // just created; never null
  }

  /** The user's meals, newest first (optionally one date). */
  async list(userId: string, date?: string) {
    const where = date ? { userId, date: parseDateOnly(date) } : { userId };
    const meals = await this.prisma.mealLog.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { meals };
  }

  /** One meal with a 5-minute photo link. Poll this while status is PENDING/ANALYZING. */
  async get(userId: string, id: string) {
    const log = await this.prisma.mealLog.findFirst({
      where: { id, userId },
      select: MEAL_DETAIL_SELECT,
    });
    if (!log) throw notFound("Meal");
    const { photoKey, aiRaw, ...rest } = log;
    const photoUrl = photoKey ? await this.storage.presignRead(photoKey, 300) : null;
    return { ...rest, aiRaw: aiHints(aiRaw), photoUrl };
  }

  /** A meal as the coach describes a draft: items, amounts and the numbers (no raw model output). */
  async draftView(userId: string, id: string) {
    const log = await this.prisma.mealLog.findFirst({
      where: { id, userId },
      select: MEAL_DRAFT_SELECT,
    });
    if (!log) throw notFound("Meal");
    return log;
  }

  /** Step 3: replace the AI's items with the user's confirmed list and recompute totals. */
  async confirm(userId: string, id: string, { items: input, note, mealType }: ConfirmMealInput) {
    const log = await this.ownedLog(userId, id);
    this.assertNotAnalysing(log.status);

    const byId = new Map(log.items.map((e) => [e.id, e]));
    // Keep the user's amount; estimated items keep their own nutrition (no food row to price from).
    const builtItems = await this.items.buildItems(input, { trustGrams: true });
    const items = input.map((i, index) => {
      const prev = i.id ? byId.get(i.id) : undefined;
      const built = builtItems[index]!;
      const edited =
        !prev ||
        prev.name !== built.name ||
        prev.quantity !== built.quantity ||
        prev.unit !== built.unit ||
        prev.grams !== built.grams;
      return {
        ...built,
        aiConfidence: prev?.aiConfidence ?? null,
        aiGrams: prev?.aiGrams ?? null,
        edited,
      };
    });
    const totals = sumMacros(items);

    const [, , confirmed] = await this.prisma.$transaction([
      this.prisma.mealItem.deleteMany({ where: { mealLogId: log.id } }),
      this.prisma.mealItem.createMany({ data: items.map((i) => ({ ...i, mealLogId: log.id })) }),
      this.prisma.mealLog.update({
        where: { id: log.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          ...(note !== undefined ? { note: note || null } : {}),
          ...(mealType ? { mealType } : {}),
          totalKcal: totals.kcal,
          totalProtein: totals.proteinG,
          totalCarbs: totals.carbsG,
          totalFat: totals.fatG,
        },
        select: { id: true, status: true },
      }),
    ]);
    return confirmed;
  }

  /** Only the owner's meal; its items go with it (cascade). */
  async remove(userId: string, id: string) {
    const { count } = await this.prisma.mealLog.deleteMany({ where: { id, userId } });
    if (!count) throw notFound("Meal");
  }

  /**
   * Run the AI again on a meal, optionally with the user's details ("small cup, 2 sachets
   * sugar"). The meal goes back to PENDING; poll GET /meals/:id as after a new upload.
   */
  async recheck(
    userId: string,
    id: string,
    { note }: RecheckInput,
  ): Promise<StatusResult<{ id: string; status: "PENDING" | "DONE" }>> {
    const log = await this.prisma.mealLog.findFirst({ where: { id, userId } });
    if (!log) throw notFound("Meal");
    this.assertNotAnalysing(log.status);
    if (log.source === "PHOTO" && log.photoKey) await this.quota.assertCanScanPhoto(userId);
    else await this.quota.assertWithinTextCap(userId);

    await this.prisma.mealLog.update({
      where: { id },
      data: { ...(note ? { note } : {}), status: "PENDING", error: null, confirmedAt: null },
    });

    // A fresh job id: BullMQ ignores a job whose id it has already seen.
    if ((await this.analyze(id, `${id}-${Date.now()}`)) === "queued") {
      return { status: 202, body: { id, status: "PENDING" } };
    }
    return { status: 200, body: { id, status: "DONE" } };
  }

  /**
   * Turn a short description ("2 sachets sugar") into priced items for an existing meal, without
   * creating a meal log. Counts toward the daily text cap like any other typed meal.
   */
  async parseItems(userId: string, { text, mealType }: ParseItemsInput) {
    await this.quota.assertWithinTextCap(userId);
    const items = await this.parseExtraItems(userId, text, mealType).catch(() => {
      throw new AppError(502, "Couldn't work that out. Try wording it differently.");
    });
    return { items };
  }

  /** Log known foods as one confirmed meal (e.g. the pre-workout snack). No AI, no scan used. */
  async logItems(userId: string, { mealType, items, date }: LogItemsInput) {
    // Unreviewed label scans are visible (and loggable) to their submitter only.
    const foods = await this.prisma.food.findMany({
      where: { id: { in: items.map((i) => i.foodId) }, ...visibleFoodTo(userId) },
      select: PRICING_SELECT,
    });
    if (foods.length !== new Set(items.map((i) => i.foodId)).size) throw notFound("Food");
    const byId = new Map(foods.map((f) => [f.id, f]));
    const built = await this.items.buildItems(
      items.map((i) => ({ ...i, name: byId.get(i.foodId)!.name })),
      { trustGrams: true },
      foods,
    );
    const log = await this.createConfirmed(userId, {
      mealType,
      date,
      source: "TEXT",
      items: built,
    });
    return { id: log.id };
  }

  /** Log one known food straight to a meal (barcode product "Add to snack"). No AI, no scan used. */
  async quickAdd(userId: string, input: QuickAddInput) {
    const day = await this.users.mealDate(userId, input.date); // 400 before any lookup
    // Unreviewed label scans are visible to their submitter only.
    const food = await this.prisma.food.findFirst({
      where: { id: input.foodId, ...visibleFoodTo(userId) },
      select: PRICING_SELECT,
    });
    if (!food) throw notFound("Food");
    const item = await this.items.buildItem(
      {
        foodId: food.id,
        name: food.name,
        quantity: input.quantity,
        unit: input.unit,
        grams: input.grams,
      },
      { trustGrams: true },
      [food],
    );
    const log = await this.createConfirmed(userId, {
      mealType: input.mealType,
      date: day,
      source: "TEXT",
      items: [item],
    });
    return { id: log.id };
  }

  /** One-tap relog of a usual: copies a confirmed meal into today (or `date`). No AI call, no scan used. */
  async relog(userId: string, mealId: string, mealType: MealTypeValue, date?: string) {
    const day = await this.users.mealDate(userId, date);
    const log = await this.usuals.relogMeal(userId, mealId, mealType, day);
    if (!log) throw notFound("Meal");
    return { id: log.id };
  }

  /**
   * A confirmed meal from already-priced items (quick add, snack, label "Save and add"), on today or
   * on `date` (a YYYY-MM-DD string is checked against the backfill window; a Date is already checked).
   */
  async createConfirmed(
    userId: string,
    input: {
      mealType: MealTypeValue;
      date?: string | Date;
      source: "TEXT" | "PHOTO";
      photoKey?: string;
      items: BuiltItem[];
    },
  ) {
    const totals = sumMacros(input.items);
    return this.prisma.mealLog.create({
      data: {
        userId,
        date:
          input.date instanceof Date ? input.date : await this.users.mealDate(userId, input.date),
        mealType: input.mealType,
        source: input.source,
        photoKey: input.photoKey,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        totalKcal: totals.kcal,
        totalProtein: totals.proteinG,
        totalCarbs: totals.carbsG,
        totalFat: totals.fatG,
        items: { create: input.items },
      },
      select: { id: true },
    });
  }

  private async parseExtraItems(userId: string, text: string, mealType: MealTypeValue) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { dietType: true },
    });
    const started = Date.now();
    try {
      const result = await this.extractor.parseMealText({
        text,
        context: { mealType, dietType: profile?.dietType ?? "VEG" },
      });
      await this.prisma.aiCall.create({
        data: {
          userId,
          type: "MEAL_TEXT",
          provider: result.usage.provider,
          model: result.usage.model,
          tokensIn: result.usage.tokensIn,
          tokensOut: result.usage.tokensOut,
          latencyMs: result.usage.latencyMs,
          success: true,
        },
      });
      if (!result.data.isFood) return [];
      const items = result.data.items;
      const built = await this.items.buildItems(items.map((d) => ({ ...d, isLiquid: d.isDrink })));
      return built.map((b, i) => ({ ...b, aiConfidence: items[i]!.confidence }));
    } catch (err) {
      await this.prisma.aiCall.create({
        data: {
          userId,
          type: "MEAL_TEXT",
          provider: this.extractor.name,
          model: "unknown",
          latencyMs: Date.now() - started,
          success: false,
          error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        },
      });
      throw err;
    }
  }

  /** Queue the analysis, or run it inline without Redis. An inline failure is recorded on the log. */
  private async analyze(mealLogId: string, jobId: string): Promise<EnqueueResult> {
    try {
      return await this.jobs.enqueue<MealAnalysisData>(
        MEAL_ANALYSIS_QUEUE,
        { mealLogId },
        { jobId },
      );
    } catch (err) {
      if (this.jobs.isAsync) throw err;
      return "done";
    }
  }

  private async ownedLog(userId: string, id: string) {
    const log = await this.prisma.mealLog.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!log) throw notFound("Meal");
    return log;
  }

  private assertNotAnalysing(status: string) {
    if (status === "PENDING" || status === "ANALYZING") {
      throw new AppError(409, "Still analysing — try again in a moment");
    }
  }
}
