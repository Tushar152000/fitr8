import type { MealStatus, MealTypeValue } from "@fitr8/contracts";

/**
 * Which meal reminders to schedule (pure, no expo: easy to test). The three times in contracts
 * `REMINDER_SCHEDULE.meals` are breakfast, lunch and dinner; a reminder is skipped once that meal is
 * logged today. Future days are always planned (the phone re-plans at every launch / log).
 */
export const MEAL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER"] as const satisfies readonly MealTypeValue[];

/** Meal types logged on a day (a failed photo scan doesn't count). */
export function loggedMealTypes(meals: readonly { mealType: MealTypeValue; status: MealStatus }[]): MealTypeValue[] {
  return [...new Set(meals.filter((m) => m.status !== "FAILED").map((m) => m.mealType))].sort();
}

/** Today's logged meal types from the dashboard, or none when it's another day's (stale) data. */
export function loggedToday(
  day: { date: string; meals: readonly { mealType: MealTypeValue; status: MealStatus }[] } | undefined,
  today: string,
): MealTypeValue[] {
  return day && day.date === today ? loggedMealTypes(day.meals) : [];
}

export interface PlannedMealReminder {
  /** Index into REMINDER_SCHEDULE.meals (0 breakfast, 1 lunch, 2 dinner). */
  slot: number;
  mealType: MealTypeValue;
  at: Date;
}

/**
 * One-off reminders for today and the next `days - 1` days at `times` ("HH:mm", local), leaving out
 * times already past and today's slots whose meal is in `loggedToday`.
 */
export function planMealReminders({
  now,
  times,
  loggedToday,
  days = 7,
}: {
  now: Date;
  times: readonly string[];
  loggedToday: readonly MealTypeValue[];
  days?: number;
}): PlannedMealReminder[] {
  const out: PlannedMealReminder[] = [];
  for (let day = 0; day < days; day++) {
    times.forEach((time, slot) => {
      const mealType = MEAL_SLOTS[slot];
      if (!mealType) return;
      if (day === 0 && loggedToday.includes(mealType)) return;
      const [h, m] = time.split(":").map(Number);
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, h!, m!, 0);
      if (at > now) out.push({ slot, mealType, at });
    });
  }
  return out;
}
