import { z } from "zod";
import { isMonth, type CalendarDayStatus, type StreakDayState } from "@fitr8/domain/progress";
import { MealTypeSchema } from "./requests.js";

/**
 * Read-only insights for the v2 Home, Meals and Progress screens: the streak sheet, the meal
 * suggestion card and the Progress screen's weekly weigh-ins. Rules live in @fitr8/domain
 * (`progress.ts`, `nutrition/suggestion.ts`); a "logged" day has at least one confirmed meal.
 */

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

// ── Streak ────────────────────────────────────────────────────────────────

export type { CalendarDayStatus, StreakDayState };

/**
 * GET /api/streak — the Today streak sheet ("12-day streak", "15 DAYS Longest streak",
 * "Log one meal today to reach 13 days. You're 3 away from your best.").
 */
export interface StreakDto {
  /** Consecutive logged days ending today, or yesterday while today isn't logged yet (same as /dashboard `streak`). */
  current: number;
  /** Longest run of consecutive logged days ever; always ≥ current. */
  longest: number;
  /** Today already has a confirmed meal (then logging today won't grow the streak). */
  loggedToday: boolean;
  /**
   * Mon–Sun of the user's current local week. "today" = today, not logged yet; "before" = a past
   * day before the user started (earlier of first plan and first logged meal), not a miss.
   * ("before" added 2026-11-26; treat unknown states like "future".)
   */
  week: { date: string; state: StreakDayState }[];
}

// ── Month calendar ────────────────────────────────────────────────────────

/** GET /api/calendar?month=YYYY-MM (default the user's current month). */
export const CalendarQuerySchema = z.object({
  month: z.string().refine(isMonth, "Use YYYY-MM").optional(),
});
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

/**
 * The Meals calendar sheet. Day status: "on_target" (logged, eaten kcal ≤ target × 1.05, under
 * counts as on), "over_target" (above that), "missed" (past day with nothing confirmed), "none"
 * (future, before the user started, or today with nothing logged yet). Today shows a status only
 * once logged.
 */
export interface CalendarDto {
  /** YYYY-MM */
  month: string;
  /** Every day of the month, in order. */
  days: { date: string; status: CalendarDayStatus }[];
  /**
   * "20 of 22 days logged · 16 on target" = daysLogged of daysElapsed · daysOnTarget. Past days
   * from the user's start only (today is not counted).
   */
  summary: { daysLogged: number; daysElapsed: number; daysOnTarget: number };
}

// ── Meal suggestion ───────────────────────────────────────────────────────

/** GET /api/meals/suggestion?mealType=DINNER&date=YYYY-MM-DD (date: today … 7 days back, default today). */
export const MealSuggestionQuerySchema = z.object({
  mealType: MealTypeSchema,
  date: ymd.optional(),
});
export type MealSuggestionQuery = z.infer<typeof MealSuggestionQuerySchema>;

/** Rule-based (no AI): one of the user's saved meals, recent meals or recent foods. */
export interface MealSuggestionDto {
  suggestion: {
    /** "Chicken breast, 200 g", a saved meal's name, or a recent meal's title ("Roti, dal tadka +1 more"). */
    title: string;
    kcal: number;
    proteinG: number;
    /** "saved" = saved meal, "meal" = a whole recently logged meal, "food" = one food from a recent meal. */
    kind: "saved" | "meal" | "food";
    /** One line, e.g. "Fits the 640 kcal and 45 g protein you have left today." */
    reason: string;
  } | null;
}

// ── Progress (extra fields on GET /api/progress) ──────────────────────────

/** One Mon–Sun week's latest weigh-in (null fields when the week had none). */
export interface WeekWeighInDto {
  /** Monday, YYYY-MM-DD. */
  weekStart: string;
  /** 0 = this week, 1 = last week, 2 = "2 weeks ago" … */
  weeksAgo: number;
  /** The weigh-in's date, YYYY-MM-DD. */
  date: string | null;
  weightKg: number | null;
}

/** Fields the Progress screen's stat tiles, trend card and check-ins list read. */
export interface ProgressStatsDto {
  /** Latest weigh-in minus the plan's start weight (negative = lost), 1 decimal; null with no weigh-in. */
  weightChangeKg: number | null;
  /**
   * "86% of days": logged days before today that were on target (eaten ≤ target × 1.05), ever.
   * `pct` is a whole number 0–100, null with no logged day yet.
   */
  onTarget: { pct: number | null; days: number; logged: number };
  /** Logging streak now and the best ever (same rule as GET /api/streak). */
  streak: { current: number; longest: number };
  /** The last 8 Mon–Sun weeks, oldest first, ending with this week: the trend line's points. */
  weeks: WeekWeighInDto[];
}
