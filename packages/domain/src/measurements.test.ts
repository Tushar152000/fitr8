import { describe, expect, it } from "vitest";
import { bodyFatNavy } from "./nutrition/body.js";
import {
  MEASUREMENT_BOUNDS,
  mergeBodyMetrics,
  withoutWeight,
  type BodyMetricValues,
} from "./measurements.js";

const man = { sex: "MALE" as const, heightCm: 175 };
const woman = { sex: "FEMALE" as const, heightCm: 162 };
const empty: BodyMetricValues = {
  weightKg: null,
  waistCm: null,
  neckCm: null,
  hipCm: null,
  chestCm: null,
  armCm: null,
  bodyFatPct: null,
};

describe("mergeBodyMetrics", () => {
  it("starts a new row from the input alone", () => {
    expect(mergeBodyMetrics(null, { chestCm: 100 }, man)).toEqual({ ...empty, chestCm: 100 });
  });

  it("keeps the day's other values when only some are given", () => {
    const existing = { ...empty, weightKg: 80, chestCm: 101, armCm: 33 };
    expect(mergeBodyMetrics(existing, { weightKg: 79.5 }, man)).toEqual({
      ...existing,
      weightKg: 79.5,
    });
  });

  it("allows a row without a weight", () => {
    expect(mergeBodyMetrics(null, { waistCm: 88 }, man).weightKg).toBeNull();
  });

  it("calculates body fat from the merged waist and neck", () => {
    const existing = { ...empty, weightKg: 80, neckCm: 38 };
    const row = mergeBodyMetrics(existing, { waistCm: 90 }, man);
    expect(row.bodyFatPct).toBe(bodyFatNavy({ ...man, waistCm: 90, neckCm: 38 }));
    expect(row.bodyFatPct).toBeGreaterThan(2);
  });

  it("uses hips for women, and no hips means no estimate", () => {
    expect(mergeBodyMetrics(null, { waistCm: 75, neckCm: 32 }, woman).bodyFatPct).toBeNull();
    const row = mergeBodyMetrics(null, { waistCm: 75, neckCm: 32, hipCm: 98 }, woman);
    expect(row.bodyFatPct).toBe(bodyFatNavy({ ...woman, waistCm: 75, neckCm: 32, hipCm: 98 }));
  });

  it("keeps the stored body fat when the day has no waist and neck to recalculate from", () => {
    const existing = { ...empty, weightKg: 80, bodyFatPct: 21 };
    expect(mergeBodyMetrics(existing, { weightKg: 79 }, man).bodyFatPct).toBe(21);
  });

  it("recalculates (to null) when the new numbers are impossible", () => {
    const existing = { ...empty, waistCm: 90, neckCm: 38, bodyFatPct: 18 };
    expect(mergeBodyMetrics(existing, { neckCm: 60, waistCm: 50 }, man).bodyFatPct).toBeNull();
  });

  it("can't calculate without the person", () => {
    expect(mergeBodyMetrics(null, { waistCm: 90, neckCm: 38 }, null).bodyFatPct).toBeNull();
  });
});

describe("MEASUREMENT_BOUNDS", () => {
  it("matches the check-in ranges and adds chest and arms", () => {
    expect(MEASUREMENT_BOUNDS.weightKg).toEqual({ min: 30, max: 250 });
    expect(MEASUREMENT_BOUNDS.chestCm).toEqual({ min: 50, max: 200 });
    expect(MEASUREMENT_BOUNDS.armCm).toEqual({ min: 15, max: 70 });
  });
});

describe("withoutWeight", () => {
  it("deletes a weight-only row", () => {
    expect(withoutWeight({ ...empty, weightKg: 80 })).toBeNull();
  });

  it("keeps the day's other measurements and body fat, clearing only the weight", () => {
    const row = { ...empty, weightKg: 80, waistCm: 88, neckCm: 38, bodyFatPct: 18.2 };
    expect(withoutWeight(row)).toEqual({ ...row, weightKg: null });
  });

  it("keeps a row that only has a body fat value", () => {
    expect(withoutWeight({ ...empty, weightKg: 80, bodyFatPct: 20 })).toEqual({
      ...empty,
      bodyFatPct: 20,
    });
  });
});
