import { describe, expect, it } from "vitest";
import {
  baseline,
  bmiFrom,
  isPlausible,
  median,
  nightWindow,
  recoveryAdvice,
  recoveryScore,
  sleepSummary,
  unionMinutes,
} from "./health.js";

const t = (iso: string) => new Date(iso);
const iv = (a: string, b: string) => ({ start: t(a), end: t(b) });

describe("unionMinutes", () => {
  it("counts overlapping intervals once (phone + watch)", () => {
    expect(
      unionMinutes([
        iv("2026-11-22T22:00:00Z", "2026-11-23T06:00:00Z"),
        iv("2026-11-22T23:00:00Z", "2026-11-23T05:00:00Z"),
      ]),
    ).toBe(480);
  });
  it("adds gaps separately and ignores empty or reversed intervals", () => {
    expect(
      unionMinutes([
        iv("2026-11-23T01:00:00Z", "2026-11-23T02:00:00Z"),
        iv("2026-11-23T00:00:00Z", "2026-11-23T00:30:00Z"),
        iv("2026-11-23T03:00:00Z", "2026-11-23T03:00:00Z"),
        iv("2026-11-23T05:00:00Z", "2026-11-23T04:00:00Z"),
      ]),
    ).toBe(90);
    expect(unionMinutes([])).toBe(0);
  });
  it("merges touching intervals", () => {
    expect(
      unionMinutes([
        iv("2026-11-23T00:00:00Z", "2026-11-23T01:00:00Z"),
        iv("2026-11-23T01:00:00Z", "2026-11-23T02:00:00Z"),
      ]),
    ).toBe(120);
  });
});

describe("sleepSummary", () => {
  it("is null without data", () => expect(sleepSummary({ sessions: [], stages: [] })).toBeNull());

  it("counts asleep stages only, overlaps once", () => {
    const s = sleepSummary({
      sessions: [iv("2026-11-22T17:00:00Z", "2026-11-23T01:00:00Z")],
      stages: [
        { ...iv("2026-11-22T17:00:00Z", "2026-11-22T17:20:00Z"), stage: "awake" },
        { ...iv("2026-11-22T17:20:00Z", "2026-11-22T20:00:00Z"), stage: "light" },
        { ...iv("2026-11-22T20:00:00Z", "2026-11-22T21:30:00Z"), stage: "deep" },
        { ...iv("2026-11-22T21:30:00Z", "2026-11-23T01:00:00Z"), stage: "rem" },
        // The watch's copy of the same deep sleep.
        { ...iv("2026-11-22T20:00:00Z", "2026-11-22T21:30:00Z"), stage: "deep" },
      ],
    })!;
    expect(s.asleepMinutes).toBe(460);
    expect(s.inBedMinutes).toBe(480);
    expect(s.awakeMinutes).toBe(20);
    expect(s.deepMinutes).toBe(90);
    expect(s.remMinutes).toBe(210);
    expect(s.lightMinutes).toBe(160);
    expect(s.start.toISOString()).toBe("2026-11-22T17:00:00.000Z");
    expect(s.end.toISOString()).toBe("2026-11-23T01:00:00.000Z");
  });

  it("treats a session without stages as asleep throughout", () => {
    const s = sleepSummary({
      sessions: [iv("2026-11-22T17:00:00Z", "2026-11-23T00:30:00Z")],
      stages: [],
    })!;
    expect(s.asleepMinutes).toBe(450);
  });

  it("ignores in-bed time when stages say awake (iPhone in-bed samples)", () => {
    const s = sleepSummary({
      sessions: [],
      stages: [
        { ...iv("2026-11-22T16:30:00Z", "2026-11-23T01:00:00Z"), stage: "in_bed" },
        { ...iv("2026-11-22T17:00:00Z", "2026-11-23T00:00:00Z"), stage: "asleep" },
      ],
    })!;
    expect(s.asleepMinutes).toBe(420);
    expect(s.inBedMinutes).toBe(510);
  });
});

describe("nightWindow", () => {
  it("is 18:00 the day before to 18:00 the day itself", () => {
    // IST midnight of 23 Nov = 22 Nov 18:30 UTC.
    const w = nightWindow(t("2026-11-22T18:30:00Z"));
    expect(w.from.toISOString()).toBe("2026-11-22T12:30:00.000Z");
    expect(w.to.toISOString()).toBe("2026-11-23T12:30:00.000Z");
  });
});

describe("bmiFrom", () => {
  it("computes BMI to 1 dp with the WHO category", () => {
    expect(bmiFrom(80.6, 178)).toEqual({ value: 25.4, category: "overweight" });
    expect(bmiFrom(50, 175)).toEqual({ value: 16.3, category: "underweight" });
    expect(bmiFrom(70, 175)).toEqual({ value: 22.9, category: "normal" });
    expect(bmiFrom(110, 170)).toEqual({ value: 38.1, category: "obese" });
  });
  it("is null for missing or impossible inputs", () => {
    expect(bmiFrom(null, 170)).toBeNull();
    expect(bmiFrom(70, null)).toBeNull();
    expect(bmiFrom(70, 1.7)).toBeNull(); // metres, not cm
    expect(bmiFrom(0, 170)).toBeNull();
  });
});

describe("isPlausible", () => {
  it("rejects out-of-range or non-numbers, accepts unknown types", () => {
    expect(isPlausible("heart_rate", 72)).toBe(true);
    expect(isPlausible("heart_rate", 0)).toBe(false);
    expect(isPlausible("oxygen_saturation", 0.97)).toBe(false); // fraction, not %
    expect(isPlausible("oxygen_saturation", 97)).toBe(true);
    expect(isPlausible("something_new", 5)).toBe(true);
    expect(isPlausible("steps", null)).toBe(false);
    expect(isPlausible("steps", Number.NaN)).toBe(false);
  });
});

describe("recoveryScore", () => {
  it("is null with no signals", () => {
    expect(
      recoveryScore({
        sleepMinutes: null,
        restingHr: null,
        restingHrBaseline: null,
        hrv: null,
        hrvBaseline: null,
      }),
    ).toBeNull();
  });
  it("is ready after a full night at usual heart rate and HRV", () => {
    const r = recoveryScore({
      sleepMinutes: 480,
      restingHr: 58,
      restingHrBaseline: 58,
      hrv: 60,
      hrvBaseline: 55,
    })!;
    expect(r.score).toBe(100);
    expect(r.level).toBe("ready");
    expect(r.basis).toEqual(["sleep", "resting_hr", "hrv"]);
    expect(r.reasons).toEqual([
      "8 h 0 min of sleep, a good night",
      "Resting heart rate is at your usual",
      "Heart-rate variability is at or above your usual",
    ]);
  });
  it("is recover after a short night with a raised heart rate and low HRV", () => {
    const r = recoveryScore({
      sleepMinutes: 270,
      restingHr: 68,
      restingHrBaseline: 58,
      hrv: 38,
      hrvBaseline: 55,
    })!;
    // sleep (4.5-4)/3.5 = .143 ×.4 = .057; rhr 0; hrv (0.69-0.7) → 0 → 6
    expect(r.score).toBe(6);
    expect(r.level).toBe("recover");
    expect(r.reasons[1]).toBe("Resting heart rate is 10 bpm above your usual");
    expect(r.reasons[2]).toBe("Heart-rate variability is 31% below your usual");
  });
  it("re-weights when only sleep is known", () => {
    const r = recoveryScore({
      sleepMinutes: 6 * 60,
      restingHr: 60,
      restingHrBaseline: null,
      hrv: null,
      hrvBaseline: null,
    })!;
    expect(r.basis).toEqual(["sleep"]);
    expect(r.score).toBe(57); // (6-4)/3.5
    expect(r.level).toBe("steady");
    expect(r.reasons[0]).toBe("6 h 0 min of sleep, a little short");
  });
  it("uses heart rate alone and reports a lower-than-usual rate", () => {
    const r = recoveryScore({
      sleepMinutes: null,
      restingHr: 54,
      restingHrBaseline: 58,
      hrv: null,
      hrvBaseline: null,
    })!;
    expect(r.score).toBe(100);
    expect(r.reasons).toEqual(["Resting heart rate is 4 bpm below your usual"]);
  });
  it("scores the boundaries", () => {
    const at = (sleepMinutes: number) =>
      recoveryScore({
        sleepMinutes,
        restingHr: null,
        restingHrBaseline: null,
        hrv: null,
        hrvBaseline: null,
      })!;
    expect(at(240).score).toBe(0);
    expect(at(450).score).toBe(100);
    expect(at(240).level).toBe("recover");
    expect(at(240).reasons[0]).toBe("4 h 0 min of sleep, short");
  });
});

describe("baseline / median", () => {
  it("needs 3 days and uses the median of up to 14", () => {
    expect(baseline([60, 62])).toBeNull();
    expect(baseline([60, 62, 70])).toBe(62);
    expect(baseline([1, 2, 3, 4])).toBe(2.5);
    expect(baseline([...Array(14).fill(50), 99, 99, 99])).toBe(50);
    expect(median([])).toBeNull();
  });
});

describe("recoveryAdvice", () => {
  it("speaks only when it matters", () => {
    expect(recoveryAdvice("ready", true)).toBeNull();
    expect(recoveryAdvice("steady", false)).toBeNull();
    expect(recoveryAdvice("steady", true)).toMatch(/warm up well/);
    expect(recoveryAdvice("recover", true)).toMatch(/Swap today/);
    expect(recoveryAdvice("recover", false)).toMatch(/Keep today easy/);
  });
});
