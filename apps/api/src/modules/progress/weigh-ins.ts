/**
 * body_metrics rows may have no weight (Profile / Measurements without a weigh-in). Every weight
 * reader (plan, progress, water, workouts, health, coach, export) uses only rows that have one.
 */

/** Prisma `where` part: rows that carry a weight. */
export const HAS_WEIGHT = { weightKg: { not: null } } as const;

/** Narrows rows read with HAS_WEIGHT (also drops any without a weight). */
export const weighed = <T extends { weightKg: number | null }>(rows: T[]) =>
  rows.filter((m): m is T & { weightKg: number } => m.weightKg != null);

/** One row read with HAS_WEIGHT, narrowed; null when there is none. */
export const weighedOne = <T extends { weightKg: number | null }>(row: T | null) =>
  row && row.weightKg != null ? (row as T & { weightKg: number }) : null;
