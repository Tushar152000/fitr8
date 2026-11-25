/**
 * Workout tab helpers: day-type colours and labels, effort and goal wording, the gym session's
 * rep and role labels, and logging a finished session. The rules live on the server
 * (@fitr8/domain/training, GET /api/training/week).
 */
import type { DayType, Effort, TrainingDayDto, TrainingGoal, TrainingType } from "@fitr8/contracts";
import { track } from "./analytics";
import { api } from "./api";
import { shortDate, weekdayName } from "./dates";
import type { Colors } from "./palette";
import { queryClient } from "./query";
import type { AdjustedExercise } from "./types";

export const DAY_LABEL: Record<DayType, string> = {
  gym: "Gym",
  run: "Run",
  hiit: "Intervals",
  yoga: "Yoga",
  walk: "Walk",
  cycle: "Cycle",
  rest: "Rest",
};

/** Colour + soft fill per day type (spec table; intervals and rides use the run colours). */
export function dayColors(c: Colors, type: DayType): { fg: string; soft: string } {
  switch (type) {
    case "gym":
      return { fg: c.dayGym, soft: c.dayGymSoft };
    case "run":
    case "hiit":
    case "cycle":
      return { fg: c.dayRun, soft: c.dayRunSoft };
    case "yoga":
      return { fg: c.dayYoga, soft: c.dayYogaSoft };
    case "walk":
      return { fg: c.dayWalk, soft: c.dayWalkSoft };
    default:
      return { fg: c.dayRest, soft: c.dayRestSoft };
  }
}

export const EFFORT_LABEL: Record<Effort, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  light: "Light",
  recover: "Recover",
};

export const GOAL_LABEL: Record<TrainingGoal, string> = {
  lose: "Lose fat",
  maintain: "Recomposition",
  gain: "Build muscle",
};

/** 16b's choices, in the spec's order. */
export const TRAINING_CHOICES: { value: TrainingType; label: string; line: string }[] = [
  { value: "gym", label: "Gym", line: "Weights and machines" },
  { value: "run", label: "Running", line: "Easy runs to intervals" },
  { value: "yoga", label: "Yoga", line: "Flow, power and slow" },
  { value: "walk", label: "Walking", line: "Brisk and long walks" },
  { value: "home", label: "Home", line: "Bodyweight, no gear" },
  { value: "cycle", label: "Cycling", line: "Rides and spin" },
];

export const ACTIVITY_LABEL: Record<string, string> = {
  SEDENTARY: "Mostly sitting",
  LIGHT: "Lightly active",
  MODERATE: "Moderately active",
  VERY_ACTIVE: "Very active",
  ATHLETE: "Athlete",
};

/** "6,240" with Indian grouping off (en-IN groups lakhs, fine for kcal up to 99,999). */
export const kcalText = (n: number) => `~${new Intl.NumberFormat("en-IN").format(n)}`;

/** "Week of 23 Nov" for a Monday YYYY-MM-DD. */
export function weekOf(start: string): string {
  return shortDate(start);
}

/** One-letter weekday (M T W T F S S) for a YYYY-MM-DD. */
export const weekdayLetter = (ymd: string) => weekdayName(ymd, "narrow");

/** "{days} days of {types}, {minutes} min each, plus active rest days." (16b live summary). */
export function setupSummary(types: TrainingType[], days: number, minutes: number): string {
  const names = types.map((t) => TRAINING_CHOICES.find((c) => c.value === t)!.label.toLowerCase());
  const list = names.length <= 1 ? (names[0] ?? "training") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${days} days of ${list}, ${minutes} min each, plus active rest days.`;
}

/** Button wording per guided day type (16d); gym and rest days have none. */
export const SESSION_VERB: Partial<Record<DayType, { start: string; done: string; did: string }>> = {
  run: { start: "Start run", done: "Finish run", did: "I already ran · log it" },
  hiit: { start: "Start intervals", done: "Finish intervals", did: "I already did it · log it" },
  cycle: { start: "Start ride", done: "Finish ride", did: "I already rode · log it" },
  yoga: { start: "Start flow", done: "Finish flow", did: "I already did it · log it" },
  walk: { start: "Start walk", done: "Finish walk", did: "I already walked · log it" },
};

/** Whole minutes, 1–300 (the training log's range). */
export const sessionMinutes = (minutes: number) => Math.min(300, Math.max(1, Math.round(minutes)));

/** Whole minutes since a start time, 1–300. */
export const minutesSince = (start: number) => sessionMinutes((Date.now() - start) / 60_000);

/** "8–12" or "30–45 s" for a timed exercise. */
export const repsLabel = (e: { repMin: number; repMax: number; timed: boolean }) =>
  `${e.repMin}–${e.repMax}${e.timed ? " s" : ""}`;

export const roleLabel = (role: AdjustedExercise["role"]) =>
  role === "main" ? "Main lift" : role === "secondary" ? "Second lift" : "Accessory";

/** Logs a day's session (a rest day counts as a walk) and refreshes the week. */
export async function logSession(day: TrainingDayDto, minutes: number, distanceKm?: number) {
  const type = day.type === "rest" ? "walk" : day.type;
  await api("/api/training/logs", {
    json: { date: day.date, type, minutes, ...(distanceKm ? { distanceKm } : {}) },
  });
  track("training_session_logged", { type, minutes });
  await queryClient.invalidateQueries({ queryKey: ["training"] });
}
