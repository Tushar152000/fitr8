import type { Experience, Phase } from "./types.js";

/** Spec §2: deficit below TDEE × 0.95, surplus above TDEE × 1.03, else maintenance. */
export function caloriePhase(targetKcal: number, tdee: number): Phase {
  if (targetKcal < tdee * 0.95) return "deficit";
  if (targetKcal > tdee * 1.03) return "surplus";
  return "maintenance";
}

/** How far below maintenance the target is, as a fraction (0.19 = 19 % deficit). */
export const deficitFraction = (targetKcal: number, tdee: number) =>
  Math.max(0, (tdee - targetKcal) / tdee);

export interface Dose {
  /** Weekly hard sets per muscle the plan aims for. */
  weeklySets: [number, number];
  main: { sets: number; reps: [number, number]; rir: number };
  secondary: { sets: number; reps: [number, number]; rir: number };
  accessory: { sets: number; reps: [number, number]; rir: number };
  cardio: string;
  deloadEvery: number;
  /** Big deficit: trim one accessory per session to sit at the low end of volume. */
  lowVolume: boolean;
}

/**
 * Spec §2 table. Beginners (and anyone we won't put in a deficit) get the low end of volume,
 * 3 × 8–10 main lifts and 2–3 reps in reserve.
 */
export function doseFor(phase: Phase, deficit: number, experience: Experience): Dose {
  if (experience === "BEGINNER") {
    return {
      weeklySets: [10, 12],
      main: { sets: 3, reps: [8, 10], rir: 3 },
      secondary: { sets: 3, reps: [8, 10], rir: 3 },
      accessory: { sets: 2, reps: [10, 12], rir: 3 },
      cardio: phaseCardio(phase),
      deloadEvery: 6,
      lowVolume: phase === "deficit" && deficit > 0.2,
    };
  }
  if (phase === "deficit") {
    return {
      weeklySets: deficit > 0.2 ? [10, 10] : [10, 12],
      main: { sets: 3, reps: [5, 8], rir: 2 },
      secondary: { sets: 3, reps: [8, 10], rir: 2 },
      accessory: { sets: 2, reps: [8, 15], rir: 2 },
      cardio: phaseCardio(phase),
      deloadEvery: 6,
      lowVolume: deficit > 0.2,
    };
  }
  if (phase === "surplus") {
    return {
      weeklySets: [14, 20],
      main: { sets: 4, reps: [6, 10], rir: 2 },
      secondary: { sets: 3, reps: [8, 10], rir: 2 },
      accessory: { sets: 3, reps: [10, 15], rir: 1 },
      cardio: phaseCardio(phase),
      deloadEvery: 8,
      lowVolume: false,
    };
  }
  return {
    weeklySets: [12, 16],
    main: { sets: 3, reps: [6, 10], rir: 2 },
    secondary: { sets: 3, reps: [8, 10], rir: 2 },
    accessory: { sets: 2, reps: [8, 15], rir: 2 },
    cardio: phaseCardio(phase),
    deloadEvery: 8,
    lowVolume: false,
  };
}

/**
 * Spec §2 cardio on rest days, as fields (the Workout tab's "Today's recovery" card shows them as
 * chips). In a deficit: 20–25 min on 2–3 rest days plus 8–10k steps and no extra HIIT, so hard
 * cardio doesn't eat into recovery; otherwise 20 min twice a week.
 */
export interface RestDayCardio {
  activity: string;
  minutes: { min: number; max: number };
  /** Rest days a week to do it on. */
  daysPerWeek: { min: number; max: number };
  /** Daily steps to aim for, or null when the plan doesn't set any. */
  steps: { min: number; max: number } | null;
  /** Keep hard intervals out (deficit). */
  noHiit: boolean;
}

export function restDayCardio(phase: Phase): RestDayCardio {
  return phase === "deficit"
    ? {
        activity: "Zone 2 walk or cycle",
        minutes: { min: 20, max: 25 },
        daysPerWeek: { min: 2, max: 3 },
        steps: { min: 8000, max: 10000 },
        noHiit: true,
      }
    : {
        activity: "Zone 2 walk or cycle",
        minutes: { min: 20, max: 20 },
        daysPerWeek: { min: 2, max: 2 },
        steps: null,
        noHiit: false,
      };
}

const range = (r: { min: number; max: number }, unit = "") =>
  r.min === r.max ? `${r.min}${unit}` : `${r.min}–${r.max}${unit}`;

/** The same advice as one sentence (`TodayWorkoutDto.cardio`, kept for shipped app builds). */
export function phaseCardio(phase: Phase): string {
  const c = restDayCardio(phase);
  const minutes = `${c.activity} ${range(c.minutes)} min`;
  if (!c.steps)
    return `${minutes}, ${c.daysPerWeek.max === 2 ? "twice" : range(c.daysPerWeek)} a week.`;
  const steps = range({ min: c.steps.min / 1000, max: c.steps.max / 1000 }, "k");
  return `${minutes} on ${range(c.daysPerWeek)} rest days, plus ${steps} steps.${c.noHiit ? " No extra HIIT." : ""}`;
}

/** Deload on every Nth week of the plan (week index is 0-based). */
export const isDeloadWeek = (weekIndex: number, every: number) =>
  weekIndex > 0 && (weekIndex + 1) % every === 0;
