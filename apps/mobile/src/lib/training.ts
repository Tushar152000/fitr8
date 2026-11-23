/**
 * Workout tab helpers (UI only): day-type colours and labels, effort and goal wording. The rules
 * live on the server (@fitr8/domain/training, GET /api/training/week).
 */
import type { DayType, Effort, TrainingGoal, TrainingType } from "@fitr8/contracts";
import type { Colors } from "./palette";

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
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${start}T00:00:00Z`),
  );
}

/** One-letter weekday (M T W T F S S) for a YYYY-MM-DD. */
export const weekdayLetter = (ymd: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));

/** "{days} days of {types}, {minutes} min each, plus active rest days." (16b live summary). */
export function setupSummary(types: TrainingType[], days: number, minutes: number): string {
  const names = types.map((t) => TRAINING_CHOICES.find((c) => c.value === t)!.label.toLowerCase());
  const list = names.length <= 1 ? (names[0] ?? "training") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${days} days of ${list}, ${minutes} min each, plus active rest days.`;
}
