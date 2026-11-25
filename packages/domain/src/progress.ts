import { weekStart } from "./dates.js";

/**
 * Logging streaks and weekly weigh-ins. Days are local calendar dates as "YYYY-MM-DD" strings; a
 * day is "logged" when it has at least one confirmed meal (the caller decides which days count).
 */

const DAY = 86_400_000;
const toMs = (ymd: string) => Date.parse(`${ymd}T00:00:00.000Z`);
const toYmd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Consecutive logged days ending today — or ending yesterday when today isn't logged yet, so the
 * streak doesn't read 0 before breakfast is logged.
 */
export function currentStreak(logged: ReadonlySet<string>, today: string): number {
  let cursor = logged.has(today) ? toMs(today) : toMs(today) - DAY;
  let streak = 0;
  while (logged.has(toYmd(cursor))) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

/** The longest run of consecutive logged days ever (0 with none). */
export function longestStreak(logged: Iterable<string>): number {
  const days = [...new Set(logged)].map(toMs).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] - days[i - 1] === DAY ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * One day of the Mon–Sun strip: "today" = today, not logged yet (a logged today is "logged");
 * "before" = a past day before the user started (not a miss).
 */
export type StreakDayState = "logged" | "today" | "missed" | "future" | "before";

/**
 * The Mon–Sun week containing `today`, each day logged / today (not yet) / missed / future, or
 * "before" for unlogged past days before `startDate` (see `trackingStart`).
 */
export function streakWeek(
  logged: ReadonlySet<string>,
  today: string,
  startDate: string | null = null,
): { date: string; state: StreakDayState }[] {
  const monday = weekStart(new Date(toMs(today))).getTime();
  return Array.from({ length: 7 }, (_, i) => {
    const date = toYmd(monday + i * DAY);
    const state: StreakDayState = logged.has(date)
      ? "logged"
      : date === today
        ? "today"
        : date > today
          ? "future"
          : startDate == null || date < startDate
            ? "before"
            : "missed";
    return { date, state };
  });
}

/** Everything the streak sheet needs: current and best streak, today's status and the week. */
export function streakDetails(
  logged: Iterable<string>,
  today: string,
  startDate: string | null = null,
) {
  const days = new Set(logged);
  const current = currentStreak(days, today);
  return {
    current,
    // A future-dated row can't make the best shorter than the current run.
    longest: Math.max(longestStreak(days), current),
    loggedToday: days.has(today),
    week: streakWeek(days, today, startDate),
  };
}

/**
 * The day the user started tracking: the earlier of their first plan (local date) and their first
 * logged meal (a meal can be backfilled before onboarding). Null when they have neither.
 */
export function trackingStart(firstPlan: string | null, firstMeal: string | null): string | null {
  if (firstPlan == null) return firstMeal;
  if (firstMeal == null) return firstPlan;
  return firstPlan < firstMeal ? firstPlan : firstMeal;
}

// ── Calorie target per day ────────────────────────────────────────────────

/** A day is over target when eaten kcal is more than this share above the target (5%). */
export const OVER_TARGET_TOLERANCE = 0.05;

/** Eaten kcal above target × (1 + OVER_TARGET_TOLERANCE). No target (no plan) is never over. */
export function isOverTarget(kcal: number, target: number | null): boolean {
  return target != null && kcal > target * (1 + OVER_TARGET_TOLERANCE);
}

export type DayTargetStatus = "on_target" | "over_target";

/** A logged day's status: over target past the tolerance, else on target (under counts as on). */
export function dayTargetStatus(kcal: number, target: number | null): DayTargetStatus {
  return isOverTarget(kcal, target) ? "over_target" : "on_target";
}

/** Share of logged days that were on target: `{days, logged, pct}` (pct 0–100 whole, null with none). */
export function onTargetShare(days: { kcal: number; target: number | null }[]) {
  const on = days.filter((d) => !isOverTarget(d.kcal, d.target)).length;
  return {
    days: on,
    logged: days.length,
    pct: days.length ? Math.round((on / days.length) * 100) : null,
  };
}

// ── Month calendar ────────────────────────────────────────────────────────

/** "none" = future, before the user started, or today with nothing logged yet. */
export type CalendarDayStatus = DayTargetStatus | "missed" | "none";

/** Valid "YYYY-MM" (month 01–12). */
export const isMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);

/** Every date of a "YYYY-MM" month. */
export function monthDays(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * The Meals calendar for one month. `eaten` maps logged days (≥1 confirmed meal) to their kcal and
 * that day's target. Past days: on/over target when logged, "missed" when not (from `startDate`).
 * Today shows its status only once logged. The summary counts past days only (today excluded):
 * "20 of 22 days logged · 16 on target" = daysLogged of daysElapsed · daysOnTarget.
 */
export function monthCalendar(input: {
  month: string;
  today: string;
  startDate: string | null;
  eaten: ReadonlyMap<string, { kcal: number; target: number | null }>;
}) {
  const { today, startDate, eaten } = input;
  let daysElapsed = 0;
  let daysLogged = 0;
  let daysOnTarget = 0;
  const days = monthDays(input.month).map((date) => {
    const day = eaten.get(date);
    const started = startDate != null && date >= startDate;
    let status: CalendarDayStatus = "none";
    if (date < today && started) {
      daysElapsed++;
      if (day) {
        status = dayTargetStatus(day.kcal, day.target);
        daysLogged++;
        if (status === "on_target") daysOnTarget++;
      } else status = "missed";
    } else if (date === today && day) {
      status = dayTargetStatus(day.kcal, day.target);
    }
    return { date, status };
  });
  return { month: input.month, days, summary: { daysLogged, daysElapsed, daysOnTarget } };
}

export interface WeekWeighIn {
  /** Monday of the week (YYYY-MM-DD). */
  weekStart: string;
  /** 0 = this week, 1 = last week, … */
  weeksAgo: number;
  /** The week's latest weigh-in on or before today, or null when there was none. */
  date: string | null;
  weightKg: number | null;
}

/**
 * The last `weeks` Mon–Sun weeks ending with today's week, oldest first: each week's latest
 * weigh-in (one point per week for the trend line and the weekly check-ins list).
 */
export function weeklyWeighIns(
  metrics: { date: string; weightKg: number }[],
  today: string,
  weeks = 8,
): WeekWeighIn[] {
  const thisMonday = weekStart(new Date(toMs(today))).getTime();
  return Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    const from = toYmd(thisMonday - weeksAgo * 7 * DAY);
    const to = toYmd(thisMonday - weeksAgo * 7 * DAY + 6 * DAY);
    let latest: { date: string; weightKg: number } | null = null;
    for (const m of metrics) {
      if (m.date < from || m.date > to || m.date > today) continue;
      if (!latest || m.date > latest.date) latest = m;
    }
    return {
      weekStart: from,
      weeksAgo,
      date: latest?.date ?? null,
      weightKg: latest?.weightKg ?? null,
    };
  });
}
