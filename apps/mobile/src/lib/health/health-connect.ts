import type { HealthDailyInput, HealthSampleInput } from "@fitr8/contracts";
import { Linking } from "react-native";
import {
  aggregateGroupByDuration,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type HealthConnectRecordResult,
  type Permission,
  type RecordType,
} from "react-native-health-connect";
import { localYmd } from "../meal-param";
import type { HealthAdapter } from "./types";

/**
 * Health Connect (Android). The record types FITR8 reads. Each one needs a matching
 * `android.permission.health.READ_*` permission in app.json and an entry in the Play Console health
 * apps declaration (docs/HEALTH.md). Keep the three lists identical.
 */
export const HEALTH_CONNECT_TYPES = [
  "Steps",
  "Distance",
  "FloorsClimbed",
  "ActiveCaloriesBurned",
  "TotalCaloriesBurned",
  "BasalMetabolicRate",
  "ExerciseSession",
  "HeartRate",
  "RestingHeartRate",
  "HeartRateVariabilityRmssd",
  "OxygenSaturation",
  "RespiratoryRate",
  "BodyTemperature",
  "BloodPressure",
  "BloodGlucose",
  "Vo2Max",
  "Weight",
  "Height",
  "BodyFat",
  "LeanBodyMass",
  "BoneMass",
  "BodyWaterMass",
  "SleepSession",
  "ElevationGained",
] as const satisfies readonly RecordType[];
type HcType = (typeof HEALTH_CONNECT_TYPES)[number];

const PERMISSIONS: Permission[] = HEALTH_CONNECT_TYPES.map((recordType) => ({ accessType: "read", recordType }));
const PAGE_SIZE = 1000;
/** Health Connect sleep stage codes → our stage names (domain `SLEEP_STAGES`). */
const STAGE: Record<number, string> = {
  0: "asleep",
  1: "awake",
  2: "asleep",
  3: "out_of_bed",
  4: "light",
  5: "deep",
  6: "rem",
};

let ready: Promise<boolean> | null = null;
const init = () => (ready ??= initialize().catch(() => false));

async function granted(): Promise<Set<string>> {
  const list = await getGrantedPermissions();
  return new Set(list.filter((p) => p.accessType === "read").map((p) => p.recordType));
}

/** Reads every page of one record type. */
async function readAll(type: HcType, from: Date, to: Date): Promise<HealthConnectRecordResult[]> {
  const out: HealthConnectRecordResult[] = [];
  let pageToken: string | undefined;
  do {
    const res = await readRecords(type, {
      timeRangeFilter: { operator: "between", startTime: from.toISOString(), endTime: to.toISOString() },
      pageSize: PAGE_SIZE,
      pageToken,
    });
    out.push(...(res.records as HealthConnectRecordResult[]));
    pageToken = res.pageToken || undefined;
  } while (pageToken);
  return out;
}

type Rec = HealthConnectRecordResult & {
  metadata?: { id?: string; dataOrigin?: string; device?: { manufacturer?: string; model?: string } };
};

/** One Health Connect record → one or more normalised samples (series and sleep stages split out). */
export function normalizeHealthConnect(rec: Rec): HealthSampleInput[] {
  const id = rec.metadata?.id;
  if (!id) return [];
  const origin = rec.metadata?.dataOrigin ?? null;
  const device = [rec.metadata?.device?.manufacturer, rec.metadata?.device?.model].filter(Boolean).join(" ") || null;
  const at = "time" in rec ? (rec.time as string) : null;
  const start = at ?? ("startTime" in rec ? (rec.startTime as string) : "");
  const end = at ?? ("endTime" in rec ? (rec.endTime as string) : start);
  const base = { origin, device };
  const one = (type: string, value: number | null, unit: string | null, data?: Record<string, unknown>) => [
    { ...base, id, type, start, end, value, unit, ...(data && { data }) },
  ];
  const minutes = (s: string, e: string) => Math.max(0, (Date.parse(e) - Date.parse(s)) / 60_000);

  switch (rec.recordType) {
    case "Steps":
      return one("steps", rec.count, "count");
    case "Distance":
      return one("distance", rec.distance.inMeters, "m");
    case "FloorsClimbed":
      return one("floors", rec.floors, "count");
    case "ActiveCaloriesBurned":
      return one("active_energy", rec.energy.inKilocalories, "kcal");
    case "TotalCaloriesBurned":
      return one("total_energy", rec.energy.inKilocalories, "kcal");
    case "BasalMetabolicRate":
      return one("basal_metabolic_rate", rec.basalMetabolicRate.inKilocaloriesPerDay, "kcal/day");
    case "ExerciseSession":
      return one("workout", minutes(start, end), "min", {
        exerciseType: rec.exerciseType,
        title: rec.title ?? null,
        notes: rec.notes ?? null,
        segments: rec.segments ?? [],
        laps: rec.laps ?? [],
      });
    case "HeartRate":
      // A series: one sample per reading, so day minimum/maximum are exact.
      return rec.samples.map((s, i) => ({
        ...base,
        id: `${id}:${i}`,
        type: "heart_rate",
        start: s.time,
        end: s.time,
        value: s.beatsPerMinute,
        unit: "bpm",
      }));
    case "RestingHeartRate":
      return one("resting_heart_rate", rec.beatsPerMinute, "bpm");
    case "HeartRateVariabilityRmssd":
      return one("hrv_rmssd", rec.heartRateVariabilityMillis, "ms");
    case "OxygenSaturation":
      return one("oxygen_saturation", rec.percentage, "%");
    case "RespiratoryRate":
      return one("respiratory_rate", rec.rate, "/min");
    case "BodyTemperature":
      return one("body_temperature", rec.temperature.inCelsius, "degC", {
        measurementLocation: rec.measurementLocation ?? null,
      });
    case "BloodPressure":
      return [
        ...one("blood_pressure_systolic", rec.systolic.inMillimetersOfMercury, "mmHg", {
          diastolic: rec.diastolic.inMillimetersOfMercury,
          bodyPosition: rec.bodyPosition,
          measurementLocation: rec.measurementLocation,
        }),
        {
          ...base,
          id: `${id}:diastolic`,
          type: "blood_pressure_diastolic",
          start,
          end,
          value: rec.diastolic.inMillimetersOfMercury,
          unit: "mmHg",
        },
      ];
    case "BloodGlucose":
      return one("blood_glucose", rec.level.inMillimolesPerLiter, "mmol/L", {
        specimenSource: rec.specimenSource,
        mealType: rec.mealType,
        relationToMeal: rec.relationToMeal,
      });
    case "Vo2Max":
      return one("vo2_max", rec.vo2MillilitersPerMinuteKilogram, "mL/kg/min", {
        measurementMethod: rec.measurementMethod,
      });
    case "Weight":
      return one("weight", rec.weight.inKilograms, "kg");
    case "Height":
      return one("height", rec.height.inMeters * 100, "cm");
    case "BodyFat":
      return one("body_fat", rec.percentage, "%");
    case "LeanBodyMass":
      return one("lean_body_mass", rec.mass.inKilograms, "kg");
    case "BoneMass":
      return one("bone_mass", rec.mass.inKilograms, "kg");
    case "BodyWaterMass":
      return one("body_water_mass", rec.mass.inKilograms, "kg");
    case "ElevationGained":
      return one("elevation_gained", rec.elevation.inMeters, "m");
    case "SleepSession":
      return [
        ...one("sleep_session", minutes(start, end), "min", { title: rec.title ?? null, notes: rec.notes ?? null }),
        ...(rec.stages ?? []).map((s, i) => ({
          ...base,
          id: `${id}:stage:${i}`,
          type: "sleep_stage",
          start: s.startTime,
          end: s.endTime,
          value: minutes(s.startTime, s.endTime),
          unit: "min",
          data: { stage: STAGE[s.stage] ?? "asleep", code: s.stage },
        })),
      ];
    default:
      return [];
  }
}

/** Daily totals with Health Connect's own de-duplication, one 24 h bucket per local day. */
async function dailyTotals(firstDay: Date, days: number, allowed: Set<string>): Promise<HealthDailyInput[]> {
  const to = new Date(firstDay.getTime() + days * 86_400_000);
  const request = {
    timeRangeFilter: { operator: "between" as const, startTime: firstDay.toISOString(), endTime: to.toISOString() },
    timeRangeSlicer: { duration: "DAYS" as const, length: 1 },
  };
  const out: HealthDailyInput[] = [];
  const add = (metric: HealthDailyInput["metric"], start: string, value: number | undefined) => {
    if (value != null && Number.isFinite(value) && value >= 0)
      out.push({ date: localYmd(new Date(start)), metric, value });
  };
  const tasks: Promise<void>[] = [];
  if (allowed.has("Steps"))
    tasks.push(
      aggregateGroupByDuration({ ...request, recordType: "Steps" }).then((g) =>
        g.forEach((r) => add("steps", r.startTime, r.result.COUNT_TOTAL)),
      ),
    );
  if (allowed.has("Distance"))
    tasks.push(
      aggregateGroupByDuration({ ...request, recordType: "Distance" }).then((g) =>
        g.forEach((r) => add("distance", r.startTime, r.result.DISTANCE?.inMeters)),
      ),
    );
  if (allowed.has("ActiveCaloriesBurned"))
    tasks.push(
      aggregateGroupByDuration({ ...request, recordType: "ActiveCaloriesBurned" }).then((g) =>
        g.forEach((r) => add("active_energy", r.startTime, r.result.ACTIVE_CALORIES_TOTAL?.inKilocalories)),
      ),
    );
  if (allowed.has("TotalCaloriesBurned"))
    tasks.push(
      aggregateGroupByDuration({ ...request, recordType: "TotalCaloriesBurned" }).then((g) =>
        g.forEach((r) => add("total_energy", r.startTime, r.result.ENERGY_TOTAL?.inKilocalories)),
      ),
    );
  if (allowed.has("FloorsClimbed"))
    tasks.push(
      aggregateGroupByDuration({ ...request, recordType: "FloorsClimbed" }).then((g) =>
        g.forEach((r) => add("floors", r.startTime, r.result.FLOORS_CLIMBED_TOTAL)),
      ),
    );
  if (allowed.has("ExerciseSession"))
    tasks.push(
      aggregateGroupByDuration({ ...request, recordType: "ExerciseSession" }).then((g) =>
        g.forEach((r) => add("exercise_minutes", r.startTime, (r.result.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60)),
      ),
    );
  // One failing metric (a permission removed meanwhile) mustn't lose the others.
  await Promise.allSettled(tasks);
  return out;
}

export const healthConnect: HealthAdapter = {
  platform: "HEALTH_CONNECT",
  label: "Health Connect",
  async availability() {
    try {
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return (await init()) ? "available" : "unavailable";
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "needs_install";
      return "unavailable";
    } catch {
      return "unavailable";
    }
  },
  async requestAccess() {
    if (!(await init())) return [];
    const result = await requestPermission(PERMISSIONS);
    return result.filter((p) => p.accessType === "read").map((p) => `read:${p.recordType}`);
  },
  async read(from, to) {
    if (!(await init())) return [];
    const allowed = await granted();
    const out: HealthSampleInput[] = [];
    for (const type of HEALTH_CONNECT_TYPES) {
      if (!allowed.has(type)) continue;
      try {
        for (const rec of await readAll(type, from, to)) out.push(...normalizeHealthConnect(rec as Rec));
      } catch {
        // Skip a type that fails (revoked meanwhile, rate limit); the next sync retries it.
      }
    }
    return out;
  },
  async daily(firstDay, days) {
    if (!(await init())) return [];
    return dailyTotals(firstDay, days, await granted());
  },
  openSettings() {
    try {
      openHealthConnectSettings();
    } catch {
      void Linking.openSettings();
    }
  },
};
