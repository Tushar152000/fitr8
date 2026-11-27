import type { StreakDto } from "@fitr8/contracts";
import { api } from "./api";

/** GET /api/streak: the Home streak pill and sheet. Refreshed with the day after logging (lib/query refreshDay). */
export const streakQuery = { queryKey: ["streak"], queryFn: () => api<StreakDto>("/api/streak") };

export type StreakDayState = StreakDto["week"][number]["state"];

/** How a week dot is drawn. "before" (a day before the user started) and unknown states look like "future". */
export function dotState(state: string): "logged" | "today" | "missed" | "future" {
  return state === "logged" || state === "today" || state === "missed" ? state : "future";
}

/** A personal best right now (current streak = longest, > 0): the flame burns. */
export const isPersonalBest = (s: Pick<StreakDto, "current" | "longest">) => s.current > 0 && s.current >= s.longest;

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/**
 * The tip under the streak card (Figma: "Log one meal today to reach 13 days. You're 3 away from
 * your best."). "Away from your best" counts from the current streak, as in the design.
 */
export function streakTip({ current, longest, loggedToday }: Pick<StreakDto, "current" | "longest" | "loggedToday">) {
  if (loggedToday) {
    const next = `You've logged today. Come back tomorrow to reach ${days(current + 1)}.`;
    if (current >= longest) return `${next} This is your best streak yet.`;
    return `${next} You're ${longest - current} away from your best.`;
  }
  if (current === 0) {
    return longest > 0
      ? `Log one meal today to start a new streak. Your best is ${days(longest)}.`
      : "Log one meal today to start your streak.";
  }
  const reach = `Log one meal today to reach ${days(current + 1)}.`;
  if (current >= longest) return `${reach} That's a new best.`;
  return `${reach} You're ${longest - current} away from your best.`;
}

/** Evening nudge starts at this local hour (20:00) while today isn't logged. */
export const AT_RISK_HOUR = 20;

/**
 * A streak at risk: there is one (current > 0), today has no meal yet and it's 8 pm or later. The
 * flame dims and the tip turns into a nudge (user request 2026-11-28).
 */
export function streakAtRisk(s: Pick<StreakDto, "current" | "loggedToday">, now = new Date()): boolean {
  return s.current > 0 && !s.loggedToday && now.getHours() >= AT_RISK_HOUR;
}

/** The nudge that replaces the tip while the streak is at risk. */
export const atRiskTip = (current: number) =>
  `It's getting late. Log one meal to keep your ${days(current)} streak alive.`;

/** Streak lengths that get a one-time celebration, with the badge's name. */
export const MILESTONES = [
  { days: 7, badge: "One week strong" },
  { days: 30, badge: "A month of momentum" },
  { days: 100, badge: "The 100 club" },
] as const;

/** The highest milestone the current streak has reached, if any. */
export function reachedMilestone(current: number) {
  return [...MILESTONES].reverse().find((m) => current >= m.days) ?? null;
}

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/** "M", "T", … for a YYYY-MM-DD. */
export function weekdayLetter(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}
