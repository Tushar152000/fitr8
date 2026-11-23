import type { HealthDailyInput, HealthSampleInput } from "@fitr8/contracts";
import {
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  type CategoryTypeIdentifier,
  type QuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import { Linking } from "react-native";
import { localYmd } from "../meal-param";
import type { HealthAdapter } from "./types";

/**
 * Apple Health (HealthKit, iPhone). The quantity types FITR8 reads, with the unit we ask HealthKit
 * for, our sample type, and a factor to our unit (HealthKit's "%" is a 0–1 fraction). Keep in sync
 * with docs/HEALTH.md (App Store privacy answers).
 */
const QUANTITIES: {
  id: QuantityTypeIdentifier;
  unit: string;
  type: string;
  /** Our unit when it differs from what HealthKit is asked for. */
  out?: string;
  factor?: number;
  data?: Record<string, unknown>;
}[] = [
  { id: "HKQuantityTypeIdentifierStepCount", unit: "count", type: "steps" },
  {
    id: "HKQuantityTypeIdentifierDistanceWalkingRunning",
    unit: "m",
    type: "distance",
    data: { kind: "walking_running" },
  },
  { id: "HKQuantityTypeIdentifierDistanceCycling", unit: "m", type: "distance", data: { kind: "cycling" } },
  { id: "HKQuantityTypeIdentifierFlightsClimbed", unit: "count", type: "floors" },
  { id: "HKQuantityTypeIdentifierActiveEnergyBurned", unit: "kcal", type: "active_energy" },
  { id: "HKQuantityTypeIdentifierBasalEnergyBurned", unit: "kcal", type: "basal_energy" },
  { id: "HKQuantityTypeIdentifierAppleExerciseTime", unit: "min", type: "exercise_minutes" },
  { id: "HKQuantityTypeIdentifierAppleStandTime", unit: "min", type: "stand_minutes" },
  { id: "HKQuantityTypeIdentifierHeartRate", unit: "count/min", type: "heart_rate", out: "bpm" },
  { id: "HKQuantityTypeIdentifierRestingHeartRate", unit: "count/min", type: "resting_heart_rate", out: "bpm" },
  { id: "HKQuantityTypeIdentifierWalkingHeartRateAverage", unit: "count/min", type: "walking_heart_rate", out: "bpm" },
  { id: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", unit: "ms", type: "hrv_sdnn" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", unit: "%", type: "oxygen_saturation", factor: 100 },
  { id: "HKQuantityTypeIdentifierRespiratoryRate", unit: "count/min", type: "respiratory_rate", out: "/min" },
  { id: "HKQuantityTypeIdentifierBodyTemperature", unit: "degC", type: "body_temperature" },
  { id: "HKQuantityTypeIdentifierBloodPressureSystolic", unit: "mmHg", type: "blood_pressure_systolic" },
  { id: "HKQuantityTypeIdentifierBloodPressureDiastolic", unit: "mmHg", type: "blood_pressure_diastolic" },
  // mg/dL → mmol/L (glucose 18.016 g/mol ÷ 10).
  {
    id: "HKQuantityTypeIdentifierBloodGlucose",
    unit: "mg/dL",
    type: "blood_glucose",
    out: "mmol/L",
    factor: 1 / 18.016,
  },
  { id: "HKQuantityTypeIdentifierVO2Max", unit: "ml/(kg*min)", type: "vo2_max", out: "mL/kg/min" },
  { id: "HKQuantityTypeIdentifierBodyMass", unit: "kg", type: "weight" },
  { id: "HKQuantityTypeIdentifierHeight", unit: "cm", type: "height" },
  { id: "HKQuantityTypeIdentifierBodyFatPercentage", unit: "%", type: "body_fat", factor: 100 },
  { id: "HKQuantityTypeIdentifierLeanBodyMass", unit: "kg", type: "lean_body_mass" },
  { id: "HKQuantityTypeIdentifierBodyMassIndex", unit: "count", type: "bmi", out: "kg/m2" },
  { id: "HKQuantityTypeIdentifierWaistCircumference", unit: "cm", type: "waist" },
];

const SLEEP: CategoryTypeIdentifier = "HKCategoryTypeIdentifierSleepAnalysis";
const MINDFUL: CategoryTypeIdentifier = "HKCategoryTypeIdentifierMindfulSession";

/** HealthKit sleep analysis values → our stage names (domain `SLEEP_STAGES`). */
const SLEEP_STAGE: Record<number, string> = {
  0: "in_bed",
  1: "asleep",
  2: "awake",
  3: "light", // "core"
  4: "deep",
  5: "rem",
};

/** Daily totals: HealthKit statistics de-duplicate iPhone + Watch. */
const DAILY: { id: QuantityTypeIdentifier; unit: string; metric: HealthDailyInput["metric"] }[] = [
  { id: "HKQuantityTypeIdentifierStepCount", unit: "count", metric: "steps" },
  { id: "HKQuantityTypeIdentifierDistanceWalkingRunning", unit: "m", metric: "distance" },
  { id: "HKQuantityTypeIdentifierActiveEnergyBurned", unit: "kcal", metric: "active_energy" },
  { id: "HKQuantityTypeIdentifierFlightsClimbed", unit: "count", metric: "floors" },
  { id: "HKQuantityTypeIdentifierAppleExerciseTime", unit: "min", metric: "exercise_minutes" },
];

/** What we ask to read (read-only; FITR8 never writes to Apple Health). */
export const HEALTHKIT_READ = [...QUANTITIES.map((q) => q.id), SLEEP, MINDFUL, "HKWorkoutTypeIdentifier"] as const;

type Sampleish = {
  uuid: string;
  startDate: Date;
  endDate: Date;
  sourceRevision?: { source?: { bundleIdentifier?: string; name?: string } };
  device?: { name?: string; model?: string; manufacturer?: string } | null;
  metadata?: unknown;
};

const meta = (s: Sampleish) => ({
  origin: s.sourceRevision?.source?.bundleIdentifier ?? null,
  device: [s.device?.manufacturer, s.device?.model ?? s.device?.name].filter(Boolean).join(" ") || null,
});

const plainMetadata = (m: unknown): Record<string, unknown> => {
  if (!m || typeof m !== "object") return {};
  try {
    return JSON.parse(JSON.stringify(m)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const healthKit: HealthAdapter = {
  platform: "APPLE_HEALTH",
  label: "Apple Health",
  async availability() {
    try {
      return (await isHealthDataAvailableAsync()) ? "available" : "unavailable";
    } catch {
      return "unavailable";
    }
  },
  async requestAccess() {
    // iOS shows its sheet once per type; it never tells apps what was allowed (privacy).
    await requestAuthorization({
      toRead: HEALTHKIT_READ as unknown as Parameters<typeof requestAuthorization>[0]["toRead"],
    });
    return [...HEALTHKIT_READ];
  },
  async read(from, to) {
    const filter = { date: { startDate: from, endDate: to } };
    const out: HealthSampleInput[] = [];
    for (const q of QUANTITIES) {
      try {
        const samples = await queryQuantitySamples(q.id, { limit: 0, ascending: true, unit: q.unit as never, filter });
        for (const s of samples as unknown as (Sampleish & { quantity: number })[]) {
          out.push({
            id: s.uuid,
            type: q.type,
            start: s.startDate.toISOString(),
            end: s.endDate.toISOString(),
            value: s.quantity * (q.factor ?? 1),
            unit: q.out ?? q.unit,
            ...meta(s),
            data: { ...q.data, hk: q.id, metadata: plainMetadata(s.metadata) },
          });
        }
      } catch {
        // Not allowed or not available on this iOS version: skip it.
      }
    }
    for (const [id, type] of [
      [SLEEP, "sleep_stage"],
      [MINDFUL, "mindfulness"],
    ] as const) {
      try {
        const samples = await queryCategorySamples(id, { limit: 0, ascending: true, filter });
        for (const s of samples as unknown as (Sampleish & { value: number })[]) {
          const minutes = (s.endDate.getTime() - s.startDate.getTime()) / 60_000;
          out.push({
            id: s.uuid,
            type,
            start: s.startDate.toISOString(),
            end: s.endDate.toISOString(),
            value: minutes,
            unit: "min",
            ...meta(s),
            data:
              type === "sleep_stage"
                ? { stage: SLEEP_STAGE[s.value] ?? "asleep", code: s.value, metadata: plainMetadata(s.metadata) }
                : { metadata: plainMetadata(s.metadata) },
          });
        }
      } catch {
        // skip
      }
    }
    try {
      const workouts = await queryWorkoutSamples({ limit: 0, ascending: true, filter });
      for (const w of workouts) {
        const json = w.toJSON() as unknown as Sampleish & {
          workoutActivityType: number;
          duration: { quantity: number; unit: string };
          totalEnergyBurned?: { quantity: number; unit: string };
          totalDistance?: { quantity: number; unit: string };
        };
        out.push({
          id: json.uuid,
          type: "workout",
          start: json.startDate.toISOString?.() ?? new Date(json.startDate).toISOString(),
          end: json.endDate.toISOString?.() ?? new Date(json.endDate).toISOString(),
          value: (new Date(json.endDate).getTime() - new Date(json.startDate).getTime()) / 60_000,
          unit: "min",
          ...meta(json),
          data: {
            activityType: json.workoutActivityType,
            duration: json.duration ?? null,
            totalEnergyBurned: json.totalEnergyBurned ?? null,
            totalDistance: json.totalDistance ?? null,
            metadata: plainMetadata(json.metadata),
          },
        });
        w.dispose?.();
      }
    } catch {
      // skip
    }
    return out;
  },
  async daily(firstDay, days) {
    const endDate = new Date(firstDay.getTime() + days * 86_400_000);
    const out: HealthDailyInput[] = [];
    await Promise.allSettled(
      DAILY.map(async (d) => {
        const buckets = await queryStatisticsCollectionForQuantity(
          d.id,
          ["cumulativeSum"],
          firstDay,
          { day: 1 },
          {
            unit: d.unit as never,
            filter: { date: { startDate: firstDay, endDate } },
          },
        );
        for (const b of buckets) {
          const value = b.sumQuantity?.quantity;
          if (b.startDate && value != null && Number.isFinite(value) && value >= 0)
            out.push({ date: localYmd(new Date(b.startDate)), metric: d.metric, value });
        }
      }),
    );
    return out;
  },
  openSettings() {
    // Apps can't open the Health app's own settings; FITR8's iOS settings page links to it.
    void Linking.openURL("x-apple-health://").catch(() => Linking.openSettings());
  },
};
