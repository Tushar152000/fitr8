/**
 * Profile sub-pages (Figma "New" v2): Measurements, Reminders' built-in switches, and Help &
 * support's "Send feedback" (read by staff at /admin/feedback).
 */
import { z } from "zod";
import { MEASUREMENT_BOUNDS } from "@fitr8/domain/measurements";

// ── Measurements ───────────────────────────────────────────────────────────

/**
 * Profile / Measurements rows, in screen order (Figma's six, then neck, which the body-fat
 * formula needs). Each is a body_metrics column; body fat is calculated, never entered.
 */
export const MEASUREMENT_KEYS = [
  "weightKg",
  "bodyFatPct",
  "waistCm",
  "chestCm",
  "hipCm",
  "armCm",
  "neckCm",
] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

/** The newest value of one measurement. */
export interface MeasurementDto {
  value: number;
  /** Local day it was measured (YYYY-MM-DD): "Updated today", "Updated 2 days ago". */
  date: string;
}

/** GET /api/measurements: each measurement's newest value, or null when never recorded. */
export type MeasurementsDto = Record<MeasurementKey, MeasurementDto | null>;

const measure = (key: keyof typeof MEASUREMENT_BOUNDS) =>
  z.number().min(MEASUREMENT_BOUNDS[key].min).max(MEASUREMENT_BOUNDS[key].max).optional();

/**
 * POST /api/measurements: any of these, at least one (bounds: @fitr8/domain/measurements). Saved
 * into today's row (the user's timezone) like a weigh-in; body fat is recalculated from it.
 */
export const MeasurementAddSchema = z
  .object({
    weightKg: measure("weightKg"),
    waistCm: measure("waistCm"),
    neckCm: measure("neckCm"),
    chestCm: measure("chestCm"),
    hipCm: measure("hipCm"),
    armCm: measure("armCm"),
  })
  .refine((m) => Object.values(m).some((v) => v !== undefined), {
    message: "Add at least one measurement",
  });
export type MeasurementAddInput = z.infer<typeof MeasurementAddSchema>;

// ── Reminder switches ──────────────────────────────────────────────────────

/**
 * When the phone schedules the built-in reminders (local notifications; the server stores only the
 * switches, `ProfileDto.remindMeals | remindWater | remindWeighIn`). Times are the user's local
 * wall clock, "HH:mm"; `weekday` is ISO (1 = Monday).
 */
export const REMINDER_SCHEDULE = {
  /** "Meal reminders 8:00 · 13:00 · 20:00" (breakfast, lunch, dinner). */
  meals: ["08:00", "13:00", "20:00"],
  /** "Water reminders Every 2 hours", 9:00–21:00 (what the app already schedules). */
  water: { everyHours: 2, from: "09:00", until: "21:00" },
  /** "Weekly weigh-in Mondays, 8:00". */
  weighIn: { weekday: 1, time: "08:00" },
} as const;

// ── Feedback ───────────────────────────────────────────────────────────────

export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_PLATFORMS = ["ios", "android", "web"] as const;
export type FeedbackPlatform = (typeof FEEDBACK_PLATFORMS)[number];

/** POST /api/feedback (signed in). */
export const FeedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Tell us a little more")
    .max(FEEDBACK_MESSAGE_MAX, `Keep it under ${FEEDBACK_MESSAGE_MAX} characters`),
  /** Optional short topic, e.g. "Bug" or "Idea". */
  topic: z.string().trim().min(1).max(40).optional(),
  /** The app's version, e.g. "0.5.0" or "0.5.0 (42)". */
  appVersion: z.string().trim().min(1).max(32).optional(),
  platform: z.enum(FEEDBACK_PLATFORMS).optional(),
});
export type FeedbackInput = z.infer<typeof FeedbackSchema>;

/** POST /api/feedback → 201. */
export interface FeedbackSentDto {
  id: string;
  createdAt: string;
}

/** GET /api/admin/feedback?page=: one message, newest first. */
export interface AdminFeedbackDto {
  id: string;
  message: string;
  topic: string | null;
  appVersion: string | null;
  platform: string | null;
  createdAt: string;
  /** Who sent it, so the team can reply. */
  user: { id: string; email: string | null; name: string | null };
}

export interface AdminFeedbackPageDto {
  items: AdminFeedbackDto[];
  page: number;
  pages: number;
  total: number;
}

// ── Profile photo ──────────────────────────────────────────────────────────

/**
 * PUT /api/profile/photo: the storage key from POST /api/profile/photo/upload-url, after the
 * client PUT the (compressed) image to its signed URL. The server checks it is the caller's own.
 */
export const ProfilePhotoSchema = z.object({
  key: z
    .string()
    .max(200)
    .regex(/^avatars\/[^/]+\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/, "Not a profile photo key"),
});
export type ProfilePhotoInput = z.infer<typeof ProfilePhotoSchema>;
