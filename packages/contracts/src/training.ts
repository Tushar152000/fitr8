import { z } from "zod";
import {
  DAY_TYPES,
  TRAINING_TYPES,
  type DayType,
  type Effort,
  type SessionBlock,
  type TrainingGoal,
  type TrainingStep,
  type TrainingType,
  type RestDayCardio,
  type WeekStyle,
} from "@fitr8/domain/training";
import type { RecoveryLevel } from "@fitr8/domain/health";

/**
 * The Workout tab (spec "Workout unlock", screens 16–16d): training profile, the weekly plan and
 * training logs. Every route is Premium (402 `pro_required`, feature `workouts`).
 */

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** POST /api/training/profile (16b). */
export const TrainingProfileSchema = z.object({
  types: z
    .array(z.enum(TRAINING_TYPES))
    .min(1, "Pick at least one way to train")
    .max(TRAINING_TYPES.length)
    .refine((t) => new Set(t).size === t.length, "Pick each type once"),
  daysPerWeek: z
    .number()
    .int()
    .refine((n) => [3, 4, 5, 6].includes(n), "Choose 3, 4, 5 or 6 days"),
  sessionMinutes: z
    .number()
    .int()
    .refine((n) => [30, 45, 60].includes(n), "Choose 30, 45 or 60 minutes"),
});
export type TrainingProfileInput = z.infer<typeof TrainingProfileSchema>;

/** GET /api/training/week?start=YYYY-MM-DD (any day; the week starting that Monday). */
export const TrainingWeekQuerySchema = z.object({ start: ymd.optional() });
export type TrainingWeekQuery = z.infer<typeof TrainingWeekQuerySchema>;

/** Types a session can be logged as (16d "I already ran · log it", focus mode, timers). */
export const LOGGABLE_DAY_TYPES = DAY_TYPES.filter(
  (t): t is Exclude<DayType, "rest"> => t !== "rest",
);

/** POST /api/training/logs */
export const TrainingLogSchema = z.object({
  date: ymd,
  type: z.enum(LOGGABLE_DAY_TYPES as [Exclude<DayType, "rest">, ...Exclude<DayType, "rest">[]]),
  minutes: z.number().int().min(1, "At least 1 minute").max(300, "At most 300 minutes"),
  distanceKm: z.number().min(0.1).max(200).optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        sets: z.number().int().min(1).max(20).optional(),
        reps: z.number().int().min(1).max(300).optional(),
        kg: z.number().min(0).max(500).optional(),
      }),
    )
    .max(30)
    .optional(),
});
export type TrainingLogInput = z.infer<typeof TrainingLogSchema>;

export type {
  DayType,
  Effort,
  RestDayCardio,
  SessionBlock,
  TrainingGoal,
  TrainingStep,
  TrainingType,
  WeekStyle,
};

export interface TrainingProfileDto {
  types: TrainingType[];
  daysPerWeek: number;
  sessionMinutes: number;
  updatedAt: string;
}

/** GET /api/training: the profile (null until 16b is saved) and what 16b prefills. */
export interface TrainingStateDto {
  profile: TrainingProfileDto | null;
  /** 16b defaults: "where you train" from onboarding, 4 days, 45 min (or the profile's values). */
  defaults: TrainingProfileInput;
  /** 16b's read-only summary from onboarding. */
  summary: {
    goal: TrainingGoal;
    weightKg: number | null;
    activityLevel: string;
  };
}

export type TrainingDayStatus = "planned" | "done" | "missed" | "today";

/** A session that was logged on a day (replaces the estimate). */
export interface TrainingLogDto {
  id: string;
  date: string;
  type: Exclude<DayType, "rest">;
  minutes: number;
  distanceKm: number | null;
  kcal: number;
}

export interface TrainingDayDto {
  date: string;
  /** "Monday" … "Sunday". */
  weekday: string;
  type: DayType;
  title: string;
  why: string;
  /** Logged minutes once logged, else the plan's; 0 on rest. */
  minutes: number;
  /** Estimate, or from the logged duration once logged; 0 on rest. */
  kcal: number;
  effort: Effort;
  steps: TrainingStep[];
  status: TrainingDayStatus;
  /** Counts towards "sessions" (walks in a mixed week are active rest). */
  session: boolean;
  blocks: SessionBlock[];
  distanceKm: number | null;
  pace: string | null;
  tips: string[];
  /** Bodyweight strength day (home training). */
  home: boolean;
  /** What was logged that day (training logs), newest first. */
  logs: TrainingLogDto[];
  /** Gym days: today's strength session lives at GET /api/workouts/today (focus mode). */
  gym: { exercises: number; logged: number } | null;
  /**
   * Gym days: the strength engine's full exercise list (sets, rep range, target kg; null kg =
   * bodyweight), in order. `steps` keeps the first four as text for older app builds. Null on other
   * days, and on a past gym day without a plan.
   */
  exercises: TrainingExerciseDto[] | null;
}

/** One exercise of a gym day (Workout tab "Up next" list). */
export interface TrainingExerciseDto {
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Reps are seconds (planks, carries). */
  timed: boolean;
  targetKg: number | null;
}

/** GET /api/training/week */
export interface TrainingWeekDto {
  /** Monday, YYYY-MM-DD. */
  start: string;
  /** The user's today (their timezone). */
  today: string;
  goal: TrainingGoal;
  style: WeekStyle;
  /** Sum of the days' kcal (logged sessions use their logged duration). */
  totalKcal: number;
  /** totalKcal ÷ 7,700, kg to 2 dp. */
  fatKg: number;
  sessions: number;
  coachNote: string;
  days: TrainingDayDto[];
  profile: TrainingProfileDto;
  /** Today's recovery from Apple Health / Health Connect, when connected and known. */
  recovery: { score: number; level: RecoveryLevel; advice: string | null } | null;
  /** The plan in a few words for the tab's eyebrow: "Full body A/B", "Upper / lower + running". */
  plan: string;
  /**
   * Cardio for rest days as fields ("Today's recovery": activity, minutes, steps, no extra HIIT).
   * `GET /workouts/today` keeps the same advice as one sentence (`cardio`).
   */
  restDay: RestDayCardio;
}
