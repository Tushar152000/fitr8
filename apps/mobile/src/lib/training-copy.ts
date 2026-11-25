/**
 * Workout tab copy per day type (Figma "Workout – Recover today", 2026-11-26): the eyebrow, the big
 * title, the dark card's label and the "Up next" wording. Rules stay on the server; this is only
 * wording.
 */
import type { DayType, RestDayCardio, TrainingDayDto, TrainingExerciseDto } from "@fitr8/contracts";
import { EFFORT_LABEL } from "./training";

const isMobility = (d: Pick<TrainingDayDto, "type" | "title">) => d.type === "yoga" && d.title === "Mobility";

/** "Strength day", "Run day" … "Rest day" (the eyebrow's first part). */
export function dayKind(d: Pick<TrainingDayDto, "type" | "title" | "home">): string {
  if (isMobility(d)) return "Mobility day";
  const kind: Record<DayType, string> = {
    gym: d.home ? "Home strength day" : "Strength day",
    run: "Run day",
    hiit: "Interval day",
    yoga: "Yoga day",
    walk: "Walk day",
    cycle: "Ride day",
    rest: "Rest day",
  };
  return kind[d.type];
}

/** Eyebrow: today "Rest day · Full body A/B"; another day "Saturday · Rest day". */
export function dayEyebrow(d: TrainingDayDto, isToday: boolean, plan: string): string {
  return isToday ? `${dayKind(d)} · ${plan}` : `${d.weekday} · ${dayKind(d)}`;
}

/** Big title: "Recover today" on today's rest day, "Rest and recover" on another; else the session. */
export function dayTitle(d: TrainingDayDto, isToday: boolean): string {
  if (d.type === "rest") return isToday ? "Recover today" : "Rest and recover";
  return d.title;
}

/** What one session of this type is called ("workout", "run" …), for the card's label. */
function sessionNoun(d: Pick<TrainingDayDto, "type" | "title">): string {
  if (isMobility(d)) return "mobility";
  const noun: Record<DayType, string> = {
    gym: "workout",
    run: "run",
    hiit: "intervals",
    yoga: "flow",
    walk: "walk",
    cycle: "ride",
    rest: "recovery",
  };
  return noun[d.type];
}

/** The dark card's label: "Today’s recovery", "Today’s run", "Friday’s workout". */
export function cardLabel(d: TrainingDayDto, isToday: boolean): string {
  return `${isToday ? "Today" : d.weekday}’s ${sessionNoun(d)}`;
}

/** The session card's headline: "45 min · Moderate". */
export const sessionHeadline = (d: TrainingDayDto) => `${d.minutes} min · ${EFFORT_LABEL[d.effort]}`;

const range = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

/** Rest-day chips from the structured cardio: "20–25 min", "8–10k steps", "No extra HIIT". */
export function restChips(r: RestDayCardio): { key: "time" | "steps" | "hiit" | "often"; text: string }[] {
  const chips: { key: "time" | "steps" | "hiit" | "often"; text: string }[] = [
    { key: "time", text: `${range(r.minutes.min, r.minutes.max)} min` },
  ];
  if (r.steps) chips.push({ key: "steps", text: `${range(r.steps.min / 1000, r.steps.max / 1000)}k steps` });
  if (r.noHiit) chips.push({ key: "hiit", text: "No extra HIIT" });
  if (!r.steps && !r.noHiit)
    chips.push({
      key: "often",
      text: r.daysPerWeek.max === 2 ? "Twice a week" : `${range(r.daysPerWeek.min, r.daysPerWeek.max)}× a week`,
    });
  return chips;
}

/** "3 × 8–10" (timed: "3 × 30–45 s"). */
export const setsLabel = (e: TrainingExerciseDto) => `${e.sets} × ${range(e.repMin, e.repMax)}${e.timed ? " s" : ""}`;

/** "45 kg" or "Bodyweight". */
export const loadLabel = (e: TrainingExerciseDto) => (e.targetKg != null ? `${e.targetKg} kg` : "Bodyweight");
