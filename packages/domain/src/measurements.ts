/**
 * Body measurements (body_metrics rows): one row per user per day. A weigh-in (POST /checkins) and
 * Profile / Measurements both merge into that day's row; body fat is never typed, only calculated
 * (US Navy) from the day's waist, neck (and hips for women) and the profile's height.
 */
import { bodyFatNavy } from "./nutrition/body.js";
import type { Sex } from "./nutrition/types.js";

/** The measured columns of a day's row (body fat is derived). */
export interface BodyMeasures {
  weightKg: number | null;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
  chestCm: number | null;
  armCm: number | null;
}

export type BodyMetricValues = BodyMeasures & { bodyFatPct: number | null };

/** Allowed ranges (inclusive). Weight, waist, neck and hips match check-in and onboarding. */
export const MEASUREMENT_BOUNDS = {
  weightKg: { min: 30, max: 250 },
  waistCm: { min: 40, max: 200 },
  neckCm: { min: 20, max: 70 },
  hipCm: { min: 50, max: 200 },
  chestCm: { min: 50, max: 200 },
  armCm: { min: 15, max: 70 },
} as const satisfies Record<keyof BodyMeasures, { min: number; max: number }>;

const MEASURE_KEYS = Object.keys(MEASUREMENT_BOUNDS) as (keyof BodyMeasures)[];

/**
 * The day's row after saving `input` over `existing` (null when there is no row yet): given values
 * replace, omitted ones stay. Body fat is recalculated when the merged row has waist and neck and the
 * person is known (null if the formula rejects the numbers); otherwise the stored value is kept.
 */
export function mergeBodyMetrics(
  existing: BodyMetricValues | null,
  input: Partial<BodyMeasures>,
  person: { sex: Sex; heightCm: number } | null,
): BodyMetricValues {
  const merged = {} as BodyMeasures;
  for (const key of MEASURE_KEYS) merged[key] = input[key] ?? existing?.[key] ?? null;

  const bodyFatPct =
    person && merged.waistCm != null && merged.neckCm != null
      ? bodyFatNavy({
          sex: person.sex,
          heightCm: person.heightCm,
          waistCm: merged.waistCm,
          neckCm: merged.neckCm,
          hipCm: merged.hipCm ?? undefined,
        })
      : (existing?.bodyFatPct ?? null);

  return { ...merged, bodyFatPct };
}

/**
 * Deleting a weigh-in: the day's row without its weight, or null when nothing else is left on it
 * (then the row is deleted). Other measurements and the body fat stay; body fat comes from waist,
 * neck and hips, never the weight, so it needs no recalculation.
 */
export function withoutWeight(existing: BodyMetricValues): BodyMetricValues | null {
  const rest = { ...existing, weightKg: null };
  return Object.values(rest).some((v) => v != null) ? rest : null;
}
