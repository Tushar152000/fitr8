/**
 * The free plan's taste of the Workout tab (product decision 2026-11-28): a free user sees their
 * own plan for the current week, but each gym day lists only its first FREE_PREVIEW_EXERCISES
 * exercises (the rest are counted, not shown), and one session a week can be done in full: the
 * week's sample day. Premium sees everything.
 */

/** Exercises a free user sees per gym day. */
export const FREE_PREVIEW_EXERCISES = 2;

/**
 * The week's free sample session: the first day that isn't a rest day, in date order. Null when
 * the week has only rest days.
 */
export function freeSampleDate(days: readonly { date: string; type: string }[]): string | null {
  const sessions = days.filter((d) => d.type !== "rest").map((d) => d.date);
  sessions.sort();
  return sessions[0] ?? null;
}

/**
 * A gym day's exercise list cut for the free plan: the first `FREE_PREVIEW_EXERCISES` and how many
 * more there are. The sample day is shown in full. `null` (no list) stays null.
 */
export function previewExercises<T>(
  list: readonly T[] | null,
  isSampleDay: boolean,
): { shown: T[] | null; locked: number } {
  if (!list) return { shown: null, locked: 0 };
  if (isSampleDay) return { shown: [...list], locked: 0 };
  return {
    shown: list.slice(0, FREE_PREVIEW_EXERCISES),
    locked: Math.max(0, list.length - FREE_PREVIEW_EXERCISES),
  };
}
