import { z } from "zod";
import {
  HEALTH_DAILY_METRICS,
  HEALTH_PLATFORMS,
  type BmiCategory,
  type HealthPlatform,
  type RecoveryLevel,
} from "@fitr8/domain/health";

/**
 * Apple Health (iPhone) and Health Connect (Android). The phone reads the records the user allowed
 * and sends them all here (`POST /api/health-data/sync`); the server stores every one and the app
 * shows six summaries (`GET /api/health-data/summary`).
 */

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const instant = z.iso.datetime({ offset: true });

export const HealthPlatformSchema = z.enum(HEALTH_PLATFORMS);

/** Most samples one sync request may carry (keeps each request well under the 1 MB body limit). */
export const HEALTH_SYNC_MAX_SAMPLES = 500;
export const HEALTH_SYNC_MAX_DAILY = 200;

/**
 * One record from the platform, normalised (types and units in `@fitr8/domain/health`
 * `HEALTH_UNITS`). `data` keeps the rest of the record as the platform gave it (stages, metadata,
 * workout details …), so nothing is lost.
 */
export const HealthSampleInputSchema = z
  .object({
    /** The platform's id for the record (plus a suffix for a series point), unique per platform. */
    id: z.string().min(1).max(200),
    type: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, "Unknown sample type"),
    start: instant,
    end: instant,
    value: z.number().finite().nullable().optional(),
    unit: z.string().max(24).nullable().optional(),
    /** App that wrote it (bundle id / package name). */
    origin: z.string().max(200).nullable().optional(),
    device: z.string().max(200).nullable().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((s) => Date.parse(s.end) >= Date.parse(s.start), {
    message: "A sample can't end before it starts",
    path: ["end"],
  });
export type HealthSampleInput = z.infer<typeof HealthSampleInputSchema>;

/** A daily total the platform de-duplicated (steps from phone + watch counted once). */
export const HealthDailyInputSchema = z.object({
  date: ymd,
  metric: z.enum(HEALTH_DAILY_METRICS),
  value: z.number().finite().min(0).max(10_000_000),
});
export type HealthDailyInput = z.infer<typeof HealthDailyInputSchema>;

/** POST /api/health-data/connect: the user allowed access on the phone. */
export const HealthConnectSchema = z.object({
  platform: HealthPlatformSchema,
  /** What the platform reported as allowed (Health Connect) or asked for (iPhone hides it). */
  permissions: z.array(z.string().min(1).max(80)).max(100).default([]),
});
export type HealthConnectInput = z.infer<typeof HealthConnectSchema>;

/** POST /api/health-data/sync */
export const HealthSyncSchema = z.object({
  platform: HealthPlatformSchema,
  samples: z.array(HealthSampleInputSchema).max(HEALTH_SYNC_MAX_SAMPLES).default([]),
  daily: z.array(HealthDailyInputSchema).max(HEALTH_SYNC_MAX_DAILY).default([]),
});
export type HealthSyncInput = z.infer<typeof HealthSyncSchema>;

/** GET /api/health-data/summary?date= */
export const HealthSummaryQuerySchema = z.object({ date: ymd.optional() });

export type { BmiCategory, HealthPlatform, RecoveryLevel };

export interface HealthConnectionDto {
  platform: HealthPlatform;
  connectedAt: string;
  lastSyncAt: string | null;
  permissions: string[];
}

/** GET /api/health-data */
export interface HealthStatusDto {
  connections: HealthConnectionDto[];
  /** How many records are stored for the user (all platforms). */
  samples: number;
}

/** POST /api/health-data/sync */
export interface HealthSyncResultDto {
  samples: number;
  daily: number;
  lastSyncAt: string;
}

/** GET /api/health-data/summary: the six things the app shows. Null = no data for that one. */
export interface HealthSummaryDto {
  date: string;
  connected: boolean;
  lastSyncAt: string | null;
  steps: { count: number; goal: number; week: { date: string; count: number | null }[] } | null;
  heartRate: {
    avg: number | null;
    min: number | null;
    max: number | null;
    resting: number | null;
    latest: { bpm: number; at: string } | null;
  } | null;
  bmi: {
    value: number;
    category: BmiCategory;
    weightKg: number;
    heightCm: number;
    /** Where the weight came from: the health app or a FITR8 weigh-in (whichever is newer). */
    weightFrom: "health" | "fitr8";
  } | null;
  spo2: { avg: number; min: number; latest: number; at: string } | null;
  sleep: {
    asleepMinutes: number;
    inBedMinutes: number;
    start: string;
    end: string;
    deepMinutes: number;
    remMinutes: number;
    lightMinutes: number;
    awakeMinutes: number;
  } | null;
  recovery: {
    score: number;
    level: RecoveryLevel;
    reasons: string[];
    basis: ("sleep" | "resting_hr" | "hrv")[];
  } | null;
}
