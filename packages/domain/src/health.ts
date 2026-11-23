/**
 * Apple Health / Health Connect data: the sample types FITR8 stores, plausibility ranges, and the
 * pure maths behind the six things the app shows (steps, heart rate, BMI, SpO2, sleep, recovery).
 * The phone sends every record it reads; the server keeps them all (`health_samples`).
 */

export const HEALTH_PLATFORMS = ["APPLE_HEALTH", "HEALTH_CONNECT"] as const;
export type HealthPlatform = (typeof HEALTH_PLATFORMS)[number];

/**
 * Normalised sample types (the phone maps each platform record to one of these, values in these
 * units). Unknown future types are still stored (the type is any snake_case name); these are the
 * ones the server understands.
 */
export const HEALTH_UNITS = {
  steps: "count",
  distance: "m",
  floors: "count",
  active_energy: "kcal",
  basal_energy: "kcal",
  total_energy: "kcal",
  exercise_minutes: "min",
  stand_minutes: "min",
  workout: "min",
  heart_rate: "bpm",
  resting_heart_rate: "bpm",
  walking_heart_rate: "bpm",
  hrv_rmssd: "ms",
  hrv_sdnn: "ms",
  oxygen_saturation: "%",
  respiratory_rate: "/min",
  body_temperature: "degC",
  skin_temperature_delta: "degC",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  blood_glucose: "mmol/L",
  vo2_max: "mL/kg/min",
  weight: "kg",
  height: "cm",
  body_fat: "%",
  lean_body_mass: "kg",
  bone_mass: "kg",
  body_water_mass: "kg",
  bmi: "kg/m2",
  basal_metabolic_rate: "kcal/day",
  waist: "cm",
  speed: "m/s",
  power: "W",
  cycling_cadence: "rpm",
  steps_cadence: "steps/min",
  elevation_gained: "m",
  wheelchair_pushes: "count",
  sleep_session: "min",
  sleep_stage: "min",
  mindfulness: "min",
} as const;
export type HealthSampleType = keyof typeof HEALTH_UNITS;

/** Daily totals the phone computes with the platform's own de-duplication (phone + watch). */
export const HEALTH_DAILY_METRICS = [
  "steps",
  "distance",
  "active_energy",
  "total_energy",
  "floors",
  "exercise_minutes",
] as const;
export type HealthDailyMetric = (typeof HEALTH_DAILY_METRICS)[number];

/** Daily step goal shown on the Steps card (docs/DESIGN.md Today grid: "6,240 / 8k"). */
export const STEPS_GOAL = 8000;

/** Sleep stages after normalising Health Connect stage codes and HealthKit sleep values. */
export const SLEEP_STAGES = [
  "in_bed",
  "asleep",
  "light",
  "deep",
  "rem",
  "awake",
  "out_of_bed",
] as const;
export type SleepStage = (typeof SLEEP_STAGES)[number];
const ASLEEP: ReadonlySet<string> = new Set(["asleep", "light", "deep", "rem"]);

/**
 * Values outside these ranges are kept (we store what the platform gave) but ignored in the
 * summaries, so one bad reading can't show a heart rate of 0 or 400.
 */
const PLAUSIBLE: Partial<Record<HealthSampleType, [number, number]>> = {
  steps: [0, 100_000],
  heart_rate: [25, 250],
  resting_heart_rate: [25, 150],
  walking_heart_rate: [30, 220],
  hrv_rmssd: [1, 300],
  hrv_sdnn: [1, 300],
  oxygen_saturation: [50, 100],
  respiratory_rate: [4, 60],
  weight: [20, 400],
  height: [80, 250],
  body_fat: [2, 75],
  bmi: [8, 90],
};

export function isPlausible(type: string, value: number | null | undefined): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  const range = PLAUSIBLE[type as HealthSampleType];
  return !range || (value >= range[0] && value <= range[1]);
}

// ── Sleep ─────────────────────────────────────────────────────────────────

export interface Interval {
  start: Date;
  end: Date;
}

/** Minutes covered by a set of intervals, overlaps counted once (phone and watch both log sleep). */
export function unionMinutes(intervals: Interval[]): number {
  const sorted = intervals
    .filter((i) => i.end.getTime() > i.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const i of sorted) {
    const s = i.start.getTime();
    const e = i.end.getTime();
    if (s > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else if (e > curEnd) curEnd = e;
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return Math.round(total / 60_000);
}

export interface SleepInput {
  /** Whole sleep sessions (Health Connect sessions, or none on iPhone). */
  sessions: Interval[];
  /** Stage intervals (Health Connect stages, HealthKit sleep analysis samples). */
  stages: (Interval & { stage: string })[];
}

export interface SleepSummary {
  /** Time asleep (light + deep + REM + unspecified), overlaps merged. */
  asleepMinutes: number;
  /** Time in bed: from the first to the last minute of any sleep record, overlaps merged. */
  inBedMinutes: number;
  start: Date;
  end: Date;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
}

/**
 * One night's sleep from sessions and stages. With stages, time asleep is the union of the asleep
 * stages; a session without stages counts as asleep throughout (Health Connect allows that).
 * Returns null when there is nothing for the night.
 */
export function sleepSummary(input: SleepInput): SleepSummary | null {
  const all = [...input.sessions, ...input.stages];
  if (!all.length) return null;
  const asleepStages = input.stages.filter((s) => ASLEEP.has(s.stage));
  // Sessions that have no stage inside them count as asleep throughout.
  const bare = input.sessions.filter(
    (s) => !input.stages.some((st) => st.start < s.end && st.end > s.start),
  );
  const asleepMinutes = unionMinutes([...asleepStages, ...bare]);
  const of = (stage: string) => unionMinutes(input.stages.filter((s) => s.stage === stage));
  return {
    asleepMinutes,
    inBedMinutes: unionMinutes(all),
    start: new Date(Math.min(...all.map((i) => i.start.getTime()))),
    end: new Date(Math.max(...all.map((i) => i.end.getTime()))),
    deepMinutes: of("deep"),
    remMinutes: of("rem"),
    lightMinutes: of("light"),
    awakeMinutes: of("awake"),
  };
}

/**
 * The window a night belongs to: sleep that ENDS between 18:00 the day before and 18:00 on `date`
 * (local), so last night's sleep shows on today and an afternoon nap doesn't start a new night.
 * `localMidnight` = the UTC instant of local midnight at the start of `date`.
 */
export function nightWindow(localMidnight: Date): { from: Date; to: Date } {
  const SIX_HOURS = 6 * 3_600_000;
  return {
    from: new Date(localMidnight.getTime() - SIX_HOURS),
    to: new Date(localMidnight.getTime() + 18 * 3_600_000),
  };
}

// ── BMI ───────────────────────────────────────────────────────────────────

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

/** BMI to one decimal and its WHO category, or null without a plausible weight and height. */
export function bmiFrom(
  weightKg: number | null,
  heightCm: number | null,
): { value: number; category: BmiCategory } | null {
  if (!isPlausible("weight", weightKg) || !isPlausible("height", heightCm)) return null;
  const m = heightCm! / 100;
  const value = Math.round((weightKg! / (m * m)) * 10) / 10;
  const category: BmiCategory =
    value < 18.5 ? "underweight" : value < 25 ? "normal" : value < 30 ? "overweight" : "obese";
  return { value, category };
}

// ── Recovery ──────────────────────────────────────────────────────────────

export interface RecoveryInput {
  sleepMinutes: number | null;
  restingHr: number | null;
  /** The user's usual resting heart rate (median of the previous 14 days, ≥ 3 days of data). */
  restingHrBaseline: number | null;
  /** Heart-rate variability (ms; RMSSD on Android, SDNN on iPhone; compared only with itself). */
  hrv: number | null;
  hrvBaseline: number | null;
}

export type RecoveryLevel = "ready" | "steady" | "recover";

export interface Recovery {
  /** 0–100. */
  score: number;
  level: RecoveryLevel;
  /** What went into it, as short readable lines. */
  reasons: string[];
  /** Which signals were available. */
  basis: ("sleep" | "resting_hr" | "hrv")[];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Recovery estimate (0–100) from last night's sleep (40%), resting heart rate against the user's
 * usual (30%) and HRV against the user's usual (30%); missing signals are left out and the rest
 * re-weighted. Sleep: 4 h → 0, 7.5 h+ → 100. Resting HR: at or below usual → 100, 10 bpm above → 0.
 * HRV: at or above usual → 100, 30% below → 0. An estimate to guide the day, not a diagnosis.
 */
export function recoveryScore(input: RecoveryInput): Recovery | null {
  const parts: { weight: number; score: number }[] = [];
  const reasons: string[] = [];
  const basis: Recovery["basis"] = [];

  if (input.sleepMinutes != null && input.sleepMinutes > 0) {
    const hours = input.sleepMinutes / 60;
    parts.push({ weight: 0.4, score: clamp01((hours - 4) / 3.5) });
    basis.push("sleep");
    const h = Math.floor(input.sleepMinutes / 60);
    const m = Math.round(input.sleepMinutes % 60);
    reasons.push(
      `${h} h ${m} min of sleep${hours >= 7 ? ", a good night" : hours >= 6 ? ", a little short" : ", short"}`,
    );
  }
  if (
    isPlausible("resting_heart_rate", input.restingHr) &&
    isPlausible("resting_heart_rate", input.restingHrBaseline)
  ) {
    const delta = input.restingHr! - input.restingHrBaseline!;
    parts.push({ weight: 0.3, score: clamp01(1 - delta / 10) });
    basis.push("resting_hr");
    const d = Math.round(Math.abs(delta));
    reasons.push(
      d < 2
        ? "Resting heart rate is at your usual"
        : delta > 0
          ? `Resting heart rate is ${d} bpm above your usual`
          : `Resting heart rate is ${d} bpm below your usual`,
    );
  }
  if (input.hrv != null && input.hrvBaseline != null && input.hrv > 0 && input.hrvBaseline > 0) {
    const ratio = input.hrv / input.hrvBaseline;
    parts.push({ weight: 0.3, score: clamp01((ratio - 0.7) / 0.3) });
    basis.push("hrv");
    reasons.push(
      ratio >= 0.95
        ? "Heart-rate variability is at or above your usual"
        : `Heart-rate variability is ${Math.round((1 - ratio) * 100)}% below your usual`,
    );
  }
  if (!parts.length) return null;
  const total = parts.reduce((t, p) => t + p.weight, 0);
  const score = Math.round((parts.reduce((t, p) => t + p.weight * p.score, 0) / total) * 100);
  const level: RecoveryLevel = score >= 67 ? "ready" : score >= 34 ? "steady" : "recover";
  return { score, level, reasons, basis };
}

/** Median, or null for an empty list. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** A baseline needs at least this many earlier days of data. */
export const BASELINE_MIN_DAYS = 3;
/** Days of history a baseline looks at. */
export const BASELINE_DAYS = 14;

/** The usual value from earlier days' readings (one per day), or null with too little data. */
export function baseline(dailyValues: number[]): number | null {
  return dailyValues.length >= BASELINE_MIN_DAYS
    ? median(dailyValues.slice(0, BASELINE_DAYS))
    : null;
}

/** What a recovery level means for today's training (one line for the Workout tab). */
export function recoveryAdvice(level: RecoveryLevel, todayHard: boolean): string | null {
  if (level === "recover")
    return todayHard
      ? "Your body is still recovering. Swap today for an easy walk or yoga, or go lighter than planned."
      : "Your body is still recovering. Keep today easy and get to bed early.";
  if (level === "steady" && todayHard)
    return "Recovery is so-so: warm up well and stop a rep or two earlier than usual.";
  return null;
}
