import type { TrainingType } from "./week.js";

/** The Workout setup's choices (TrainingProfileSchema): 3–6 days, 30 / 45 / 60 minutes. */
export const SETUP_DAYS = [3, 4, 5, 6] as const;
export const SETUP_MINUTES = [30, 45, 60] as const;

/**
 * The Workout setup prefilled from onboarding (2026-11-28: it used to ignore it and always say 4
 * days × 45 min). Onboarding allows 2–6 days and 15–120 minutes, so days are clamped to 3–6 and
 * minutes snap to the nearest of 30 / 45 / 60 (a tie goes to the shorter session). Types: a full gym
 * → "gym", otherwise a home plan; a fat-loss goal adds easy "walk" days.
 */
export function setupDefaults(input: {
  trainingDaysPerWeek: number;
  sessionMinutes: number;
  equipment: "FULL_GYM" | "DUMBBELLS" | "BODYWEIGHT";
  goal: "FAT_LOSS" | "MUSCLE_GAIN" | "RECOMPOSITION";
}): { types: TrainingType[]; daysPerWeek: number; sessionMinutes: number } {
  const daysPerWeek = Math.min(6, Math.max(3, Math.round(input.trainingDaysPerWeek)));
  let sessionMinutes: number = SETUP_MINUTES[0];
  for (const m of SETUP_MINUTES)
    if (Math.abs(m - input.sessionMinutes) < Math.abs(sessionMinutes - input.sessionMinutes))
      sessionMinutes = m;
  const types: TrainingType[] = [input.equipment === "FULL_GYM" ? "gym" : "home"];
  if (input.goal === "FAT_LOSS") types.push("walk");
  return { types, daysPerWeek, sessionMinutes };
}
