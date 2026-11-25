import { Injectable } from "@nestjs/common";
import { localDate, parseDateOnly } from "@fitr8/domain/dates";
import { sumMacros } from "@fitr8/domain/nutrition";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { StorageService } from "../../infra/storage/storage.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";

const DAY_MS = 86_400_000;

/** The meal columns a day needs: the list (title, photo, kcal) and the totals. Never the model's raw output. */
const DAY_MEAL_SELECT = {
  id: true,
  date: true,
  mealType: true,
  source: true,
  inputText: true,
  status: true,
  photoKey: true,
  note: true,
  totalKcal: true,
  totalProtein: true,
  totalCarbs: true,
  totalFat: true,
  createdAt: true,
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
    },
  },
} as const;

/** Screen 6 (Today): the day's targets, meals and totals, plus the logging streak. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetsService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
  ) {}

  /**
   * GET /dashboard?date=YYYY-MM-DD (default the user's today): the day's targets, eaten totals and
   * meals (with 1 h photo links), streak and timezone — only what Today and Meals read.
   */
  async getDay(userId: string, ymd?: string) {
    const { day, streak, timezone } = await this.withStreak(userId, ymd);
    const meals = await Promise.all(
      day.meals.map(async (m) => ({
        id: m.id,
        date: m.date,
        mealType: m.mealType,
        source: m.source,
        inputText: m.inputText,
        status: m.status,
        totalKcal: m.totalKcal,
        createdAt: m.createdAt,
        items: m.items.map((i) => ({ name: i.name })),
        photoUrl: await this.storage.presignReadOrNull(m.photoKey, 3600),
      })),
    );
    const target = day.target && {
      kcal: day.target.kcal,
      proteinG: day.target.proteinG,
      carbsG: day.target.carbsG,
      fatG: day.target.fatG,
    };
    return { date: day.date, target, eaten: day.eaten, meals, streak, timezone };
  }

  /**
   * The coach's view of a day: target (with its reason), eaten, what's left, each meal with its
   * items' amounts and macros, and the streak. No photo links.
   */
  async coachDay(userId: string, date: Date) {
    const { day, streak, timezone } = await this.withStreak(userId, date);
    const meals = day.meals.map(({ photoKey, ...m }) => ({ ...m, hasPhoto: photoKey != null }));
    return { ...day, meals, streak, timezone };
  }

  /** One timezone read gives both the default date and the streak's today. */
  private async withStreak(userId: string, date: Date | string | undefined) {
    const timezone = await this.users.timezone(userId);
    const today = localDate(timezone);
    const day = date instanceof Date ? date : date ? parseDateOnly(date) : today;
    const [totals, streak] = await Promise.all([
      this.dayTotals(userId, day),
      this.loggingStreak(userId, today),
    ]);
    return { day: totals, streak, timezone };
  }

  /** Target, confirmed totals and every meal (any status) for the date. */
  async dayTotals(userId: string, date: Date) {
    const [target, meals] = await Promise.all([
      this.targets.targetForDay(userId, date),
      this.prisma.mealLog.findMany({
        where: { userId, date },
        select: DAY_MEAL_SELECT,
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const confirmed = meals.filter((m) => m.status === "CONFIRMED");
    const eaten = sumMacros(
      confirmed.map((m) => ({
        kcal: m.totalKcal,
        proteinG: m.totalProtein,
        carbsG: m.totalCarbs,
        fatG: m.totalFat,
      })),
    );

    return {
      date: date.toISOString().slice(0, 10),
      target: target && {
        kcal: target.kcal,
        proteinG: target.proteinG,
        carbsG: target.carbsG,
        fatG: target.fatG,
        reason: target.reason,
      },
      eaten,
      remainingKcal: target ? Math.round(target.kcal - eaten.kcal) : null,
      meals,
    };
  }

  /**
   * Consecutive days with at least one confirmed meal, ending today — or yesterday, so the
   * streak doesn't read 0 before breakfast is logged.
   */
  async loggingStreak(userId: string, today: Date): Promise<number> {
    const rows = await this.prisma.mealLog.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        date: { lte: today, gte: new Date(today.getTime() - 365 * DAY_MS) },
      },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
    });
    const days = new Set(rows.map((r) => r.date.getTime()));
    let cursor = days.has(today.getTime()) ? today.getTime() : today.getTime() - DAY_MS;
    let streak = 0;
    while (days.has(cursor)) {
      streak++;
      cursor -= DAY_MS;
    }
    return streak;
  }
}

export type DashboardDay = Awaited<ReturnType<DashboardService["getDay"]>>;
