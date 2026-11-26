/**
 * JSON-wire shapes of every API response the clients read. The API's controllers are annotated with
 * these types, so the compiler checks the server against them; web and mobile import them instead
 * of declaring their own copies. Dates travel as ISO strings (`Jsonify` below).
 */
import type {
  AdjustedExercise,
  AdjustedSession,
  CoachRule,
  NextTarget,
  PlanDay,
  Prescription,
  SnackOption,
  WeekPlan,
} from "@fitr8/domain/training";
import type { LabelRead } from "./ai.js";
import type { MealTypeValue, OnboardingInput } from "./requests.js";
import type { ProgressStatsDto } from "./insights.js";

export type { AdjustedExercise, AdjustedSession, CoachRule, NextTarget, PlanDay, Prescription };

/**
 * What `JSON.stringify` makes of a value, at the type level: `Date` becomes its ISO string, recursively.
 * The API uses it to check a service's return value (which may hold Dates) against a DTO.
 */
export type Jsonify<T> = T extends Date
  ? string
  : T extends string | number | boolean | null | undefined
    ? T
    : T extends readonly (infer U)[]
      ? Jsonify<U>[]
      : T extends object
        ? { [K in keyof T]: Jsonify<T[K]> }
        : T;

// ── Enums (as stored in the database) ─────────────────────────────────────

export type Sex = OnboardingInput["sex"];
export type ActivityLevel = OnboardingInput["activityLevel"];
export type DietType = OnboardingInput["dietType"];
export type Experience = OnboardingInput["experience"];
export type Equipment = OnboardingInput["equipment"];
export type GoalType = OnboardingInput["goal"]["type"];
export type MealStatus = "PENDING" | "ANALYZING" | "READY" | "CONFIRMED" | "FAILED";
export type MealSource = "PHOTO" | "TEXT";
export type FoodSource =
  | "IFCT"
  | "INDB"
  | "USDA"
  | "CUSTOM"
  | "AI_ESTIMATE"
  | "OPEN_FOOD_FACTS"
  | "LABEL_SCAN"
  | "FATSECRET"
  | "EDAMAM";

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** `{ id }` of the row a POST created (log-items, quick-add, relog, label scan, label save). */
export interface CreatedDto {
  id: string;
}

// ── Auth and users ────────────────────────────────────────────────────────

/** The `profiles` row as GET /api/me sends it (no owner id or row timestamps). */
export interface ProfileDto {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  dietType: DietType;
  experience: Experience;
  equipment: Equipment;
  trainingDaysPerWeek: number;
  sessionMinutes: number;
  injuries: string[];
  medicalFlag: boolean;
  medicalNote: string | null;
  timezone: string;
  /** @deprecated Older app builds only; use `remindMeals`. */
  remindLunch: boolean;
  /** @deprecated Older app builds only; use `remindMeals`. */
  remindDinner: boolean;
  remindWater: boolean;
  /** Meal reminders at REMINDER_SCHEDULE.meals (contracts profile-extras). */
  remindMeals: boolean;
  /** Weekly weigh-in reminder at REMINDER_SCHEDULE.weighIn. */
  remindWeighIn: boolean;
  onboardedAt: string | null;
}

/** GET /api/me */
export interface MeDto {
  id: string;
  /** First (preferred) name. Google/Apple fill it with the full name until the user sets one. */
  name: string | null;
  lastName: string | null;
  /** E.164, e.g. "+919876543210". */
  phone: string | null;
  email: string | null;
  /**
   * The photo to show: the uploaded profile photo (a signed URL, valid 24 h) or else the sign-in
   * provider's picture (Google). Null when there's neither.
   */
  image: string | null;
  /** True when `image` is a photo the user uploaded (Profile offers "Remove photo"). */
  hasPhoto: boolean;
  onboarded: boolean;
  /**
   * Onboarded but away for 90+ days (@fitr8/domain/activity): the app asks only the numbers that
   * change (weight, height, activity, training time) before showing Today. Cleared by
   * POST /api/welcome-back or POST /api/me/active ("Not now").
   */
  welcomeBack: boolean;
  profile: ProfileDto | null;
  /** FITR8 Pro or the free plan (docs/PREMIUM.md). */
  plan: "FREE" | "PRO";
}

/** GET /api/profile/phone-check */
export interface PhoneCheckDto {
  /** The number in E.164. */
  phone: string;
  /** False when another account already has it (your own number counts as available). */
  available: boolean;
}

/** PATCH /api/profile/reminders */
export interface RemindersDto {
  remindMeals: boolean;
  remindWater: boolean;
  remindWeighIn: boolean;
  /** @deprecated Older app builds only; use `remindMeals`. */
  remindLunch: boolean;
  /** @deprecated Older app builds only; use `remindMeals`. */
  remindDinner: boolean;
}

// ── Plan ──────────────────────────────────────────────────────────────────

/** The `daily_targets` row. */
export interface DailyTargetDto extends Macros {
  id: string;
  userId: string;
  goalId: string | null;
  effectiveFrom: string;
  reason: string;
  createdAt: string;
}

/** The "Your plan" summary. POST /api/onboarding returns it; GET /api/plan nests it. */
export interface PlanSummaryDto {
  bmi: { value: number; category: string };
  bodyFatPct: number | null;
  /** The daily target's numbers (the full row is on GET /api/targets). */
  target: Macros;
  plan: {
    bmr: number;
    tdee: number;
    targetWeightKg: number;
    weeklyChangeKg: number;
    neededWeeklyChangeKg: number;
    feasible: boolean;
    suggestedTargetDate?: string;
    closerTargetWeightKg?: number;
    warnings: string[];
  };
}

/** POST /api/welcome-back: the recomputed plan for the kept goal. */
export interface WelcomeBackDto {
  summary: PlanSummaryDto;
  /** The goal's target date went by during the break: the app suggests setting a new goal. */
  goalPassed: boolean;
}

/** GET /api/targets */
export interface TargetsDto {
  target: DailyTargetDto;
}

/** GET /api/plan */
export interface PlanDto {
  summary: PlanSummaryDto;
  goal: {
    type: GoalType;
    targetDate: string;
    targetWeightKg: number | null;
    targetBodyFatPct: number | null;
  };
  metric: {
    date: string;
    bodyFatPct: number | null;
    weightKg: number;
    waistCm: number | null;
    neckCm: number | null;
    hipCm: number | null;
  };
  training: { daysPerWeek: number; sessionMinutes: number };
}

/** POST /api/goal/option */
export type GoalOptionDto =
  { ok: true; changed: false } | { ok: true; changed: true; target: DailyTargetDto };

// ── Meals ─────────────────────────────────────────────────────────────────

/** The `meal_items` row. */
export interface MealItemDto extends Macros {
  id: string;
  mealLogId: string;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  aiConfidence: number | null;
  aiGrams: number | null;
  approximate: boolean;
  edited: boolean;
  isLiquid: boolean;
}

/** The `meal_logs` row with its items (GET /api/meals, PUT /api/meals/:id, POST /api/meals when analysed inline). */
export interface MealLogDto {
  id: string;
  userId: string;
  date: string;
  mealType: MealTypeValue;
  source: MealSource;
  photoKey: string | null;
  inputText: string | null;
  status: MealStatus;
  /** The model's raw output (JSON); clients read only optional hints from it. */
  aiRaw: unknown;
  aiNotes: string | null;
  note: string | null;
  error: string | null;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: MealItemDto[];
}

/** One item of GET /api/meals/:id. */
export type MealDetailItemDto = Omit<MealItemDto, "mealLogId" | "aiGrams">;

/**
 * GET /api/meals/:id — the log with a short-lived photo link (polled while analysing, so only what
 * the review screen reads).
 */
export interface MealDetailDto {
  id: string;
  date: string;
  mealType: MealTypeValue;
  source: MealSource;
  inputText: string | null;
  status: MealStatus;
  /** Hints from the model's output; only `hiddenFatLikely` (turns the ghee switch on). */
  aiRaw: { hiddenFatLikely?: boolean } | null;
  aiNotes: string | null;
  note: string | null;
  error: string | null;
  totalKcal: number;
  createdAt: string;
  items: MealDetailItemDto[];
  photoUrl: string | null;
}

/** PUT /api/meals/:id — the confirmed meal's id (clients refetch the day). */
export interface ConfirmedMealDto {
  id: string;
  status: MealStatus;
}

/** GET /api/meals?date= */
export interface MealListDto {
  meals: MealLogDto[];
}

/**
 * POST /api/meals: 202 while queued (`PENDING`), or 201 once analysed inline (or an empty manual
 * log). Clients open GET /api/meals/:id with the id.
 */
export interface CreateMealDto {
  id: string;
  status: MealStatus;
}

/** POST /api/meals/:id/recheck: 202 queued, or 200 "DONE" when analysed inline. */
export interface RecheckDto {
  id: string;
  status: "PENDING" | "DONE";
}

/** POST /api/meals/upload-url */
export interface UploadUrlDto {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

/** One priced item from POST /api/meals/parse-items (nothing is saved). */
export interface ParsedItemDto extends Macros {
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  approximate: boolean;
  isLiquid: boolean;
  aiConfidence: number;
}

/** POST /api/meals/parse-items */
export interface ParsedItemsDto {
  items: ParsedItemDto[];
}

/** GET /api/usage — photo scans used today (also the `details` of a 429 from a photo scan). */
export interface UsageDto {
  used: number;
  limit: number;
  left: number;
  resetsAt: string;
  plan: "FREE" | "PRO";
  /**
   * Meals logged by typing (source TEXT) on the user's local today and this calendar month, for
   * the Premium banner and Profile card. Only on GET /api/usage, not in a 429's details.
   */
  typedMeals?: { today: number; thisMonth: number };
}

/** One entry of GET /api/meals/usuals. */
export interface UsualDto {
  mealId: string;
  mealType: MealTypeValue;
  count: number;
  names: string[];
  kcal: number;
  proteinG: number;
  carbsG: number;
}

/** GET /api/meals/usuals */
export interface UsualsDto {
  usuals: UsualDto[];
}

/** One item of a saved meal, priced when it was saved. */
export interface SavedMealItemDto extends Macros {
  id: string;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  approximate: boolean;
  isLiquid: boolean;
}

/** A user's own repeat meal (GET /api/saved-meals). Logging it never uses an AI scan. */
export interface SavedMealDto {
  id: string;
  name: string;
  mealType: MealTypeValue | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: SavedMealItemDto[];
}

export interface SavedMealsDto {
  savedMeals: SavedMealDto[];
}

/** A repeating alert the phone schedules: monthly on `day` (1–28), else weekly on `weekday` (0 = Sunday), else daily. */
export interface ReminderSlotDto {
  day: number | null;
  weekday: number | null;
  hour: number;
  minute: number;
}

/** One rule of a reminder, as the app shows and edits it. */
export interface ReminderRuleDto {
  cron: string;
  /** "Every month on the second-last day at 6:00 pm". */
  summary: string;
  /** true: the phone repeats it by itself; false: a changing date, scheduled as `upcoming` times. */
  repeating: boolean;
  /** Days of the week + time, when the rule is that simple shape (the app's day/time editor); else null. */
  weekly: { minute: number; hours: number[]; weekdays: number[] } | null;
}

/** GET /api/reminders. Everything the phone needs to schedule it is derived on the server. */
export interface ReminderDto {
  id: string;
  title: string;
  description: string | null;
  crons: string[];
  enabled: boolean;
  prompt: string | null;
  /** The whole reminder in plain English. */
  summary: string;
  rules: ReminderRuleDto[];
  /** Repeating alerts (daily / weekly / monthly on a fixed date). */
  slots: ReminderSlotDto[];
  /** Exact wall-clock times ("2026-11-29T18:00") for changing dates; the app re-plans on launch. */
  upcoming: string[];
  /** When it next fires, wall-clock in the user's timezone; null if never. */
  nextAt: string | null;
}

export interface ReminderListDto {
  reminders: ReminderDto[];
  /** How many a user may have. */
  max: number;
}

/** POST /api/reminders/parse: a draft to review before saving. */
export interface ReminderDraftDto {
  title: string;
  description: string | null;
  crons: string[];
  summary: string;
  rules: ReminderRuleDto[];
  nextAt: string | null;
}

// ── Foods ─────────────────────────────────────────────────────────────────

/** A `foods` row as the barcode product screen reads it (GET /api/foods/barcode/:code). */
export interface FoodDto {
  id: string;
  name: string;
  source: FoodSource;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isLiquid: boolean;
  brand: string | null;
  servingSizeG: number | null;
  servingLabel: string | null;
  imageUrl: string | null;
  sugarPer100g: number | null;
  sodiumMgPer100g: number | null;
  verified: boolean;
}

/** One hit of GET /api/foods?q= */
export interface FoodHitDto {
  id: string;
  name: string;
  per100g: { kcal: number; protein: number; carbs: number; fat: number };
  units: { unit: string; grams: number }[];
  isLiquid: boolean;
}

/** GET /api/foods?q= */
export interface FoodSearchDto {
  foods: FoodHitDto[];
}

/** GET /api/foods/barcode/:code (404 with `details.code` for an unknown product). */
export interface BarcodeProductDto {
  code: string;
  food: FoodDto | null;
}

/**
 * The `details` of GET /api/foods/barcode/:code's 404. `name`/`brand`/`imageUrl` are present when
 * a product database knew the product but not its nutrition: the app prefills the label scan.
 */
export interface BarcodeNotFoundDetails {
  code: string;
  name?: string;
  brand?: string | null;
  imageUrl?: string | null;
}

/** GET /api/foods/label/:id — the values read from a label photo, for the user to check. */
export interface LabelScanDto {
  id: string;
  name: string;
  per100g: LabelRead["per100g"];
  servingSizeG: number | null;
  servingLabel: string | null;
}

// ── Progress ──────────────────────────────────────────────────────────────

/** GET /api/dashboard — one meal as the day's meal list shows it. */
export interface DashboardMealDto {
  id: string;
  date: string;
  mealType: MealTypeValue;
  source: MealSource;
  inputText: string | null;
  status: MealStatus;
  totalKcal: number;
  createdAt: string;
  /** Each item as the Meals tab lists it: name (also the meal's title), amount and kcal. */
  items: {
    name: string;
    quantity: number;
    unit: string;
    grams: number;
    kcal: number;
    isLiquid: boolean;
  }[];
  photoUrl: string | null;
}

/** GET /api/dashboard?date= */
export interface DashboardDto {
  date: string;
  target: Macros | null;
  eaten: Macros;
  meals: DashboardMealDto[];
  streak: number;
  timezone: string;
}

/** One day of GET /api/history. */
export interface HistoryDayDto {
  /** YYYY-MM-DD */
  date: string;
  /** Confirmed meals only. */
  kcal: number;
  proteinG: number;
  /** The target in effect that day. */
  target: number | null;
  logged: boolean;
  isToday: boolean;
  meals: { id: string; mealType: MealTypeValue; title: string; kcal: number; createdAt: string }[];
}

/** GET /api/history?days=7|30 */
export interface HistoryDto {
  days: HistoryDayDto[];
  daysLogged: number;
  avgKcalFullDays: number | null;
}

/** The `body_metrics` row (a weigh-in). */
export interface BodyMetricDto {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  /** Calculated (US Navy) from the day's waist, neck and hips; never entered. */
  bodyFatPct: number | null;
  createdAt: string;
}

/** POST /api/checkins */
export interface CheckinDto {
  metric: BodyMetricDto;
}

/** GET /api/checkins */
export interface CheckinsDto {
  metrics: BodyMetricDto[];
}

/** GET /api/progress (stat tiles, trend and check-ins fields: `ProgressStatsDto` in insights.ts) */
export interface ProgressDto extends ProgressStatsDto {
  points: { date: string; weightKg: number; avg7: number }[];
  /** The newest weigh-in (prefills the check-in form). */
  latest: { weightKg: number; waistCm: number | null } | null;
  plan: {
    startDate: string;
    targetDate: string;
    startWeightKg: number;
    targetWeightKg: number;
    weeklyChangeKg: number;
    goalType: GoalType;
  };
  weeklyChange: number | null;
  target: { kcal: number } | null;
  avgIntake: number | null;
  daysLogged: number;
}

// ── Water ─────────────────────────────────────────────────────────────────

/** GET /api/water and POST /api/water */
export interface WaterDayDto {
  date: string;
  targetMl: number;
  reason: string;
  tip: string;
  caution: string | null;
  consumedMl: number;
  logs: { id: string; ml: number }[];
  remind: boolean;
}

// ── Workouts ──────────────────────────────────────────────────────────────

/** "before" is a training day that fell before this week's first plan existed, so not a miss. */
export type DayState = "done" | "today" | "planned" | "missed" | "before" | "rest";

/** The pre-workout snack suggestion, with what to send to log it. */
export type SnackPickDto = SnackOption & {
  log:
    | { kind: "usual"; mealId: string }
    | { kind: "items"; items: { foodId: string; quantity: number; unit: string; grams: number }[] };
};

/** GET /api/workouts/today?energy= */
export interface TodayWorkoutDto {
  planId: string;
  phase: WeekPlan["phase"];
  split: string;
  deload: boolean;
  sessionMinutes: number;
  cardio: string;
  notes: string[];
  strip: { date: string; name: string | null; state: DayState }[];
  session: AdjustedSession | null;
  completed: string[];
  nextDay: { date: string; name: string; exercises: PlanDay["exercises"] } | null;
  fuel: { ratio: number; low: boolean; eatenKcal: number; targetKcal: number };
  snack: SnackPickDto | null;
}

/** POST /api/workouts/logs */
export interface WorkoutLogResultDto {
  exerciseSlug: string;
  next: NextTarget;
}

/** POST /api/workouts/generate */
export interface GeneratedPlanDto {
  id: string;
  weekStart: string;
  version: number;
  plan: WeekPlan;
}
