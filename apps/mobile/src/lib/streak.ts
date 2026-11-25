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

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/** "M", "T", … for a YYYY-MM-DD. */
export function weekdayLetter(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}
