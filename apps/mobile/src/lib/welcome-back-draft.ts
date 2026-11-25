import type { WelcomeBackInput } from "@fitr8/contracts";
import type { Profile } from "@/lib/types";

/** The welcome-back form. Number fields stay strings until submit so partial input like "72." is allowed. */
export interface WelcomeBackDraft {
  weightKg: string;
  heightCm: string;
  waistCm: string;
  neckCm: string;
  hipCm: string;
  activityLevel: Profile["activityLevel"];
  equipment: Profile["equipment"];
  trainingDaysPerWeek: number;
  sessionMinutes: number;
  injuries: string;
  medicalFlag: boolean;
}
export type WelcomeBackErrors = Partial<Record<keyof WelcomeBackDraft, string>>;

/** A stored number as field text ("" when there is none). */
export const numberText = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : undefined);

/** Weight starts empty on purpose (the old one is the hint); the rest is prefilled from the profile. */
export function welcomeBackDraft(profile: Profile): WelcomeBackDraft {
  return {
    weightKg: "",
    heightCm: numberText(profile.heightCm),
    waistCm: "",
    neckCm: "",
    hipCm: "",
    activityLevel: profile.activityLevel,
    equipment: profile.equipment,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    injuries: profile.injuries.join(", "),
    medicalFlag: profile.medicalFlag,
  };
}

/** Same ranges as onboarding (contracts WelcomeBackSchema). */
export function validateWelcomeBack(d: WelcomeBackDraft, bodyFatGoal: boolean): WelcomeBackErrors {
  const e: WelcomeBackErrors = {};
  const range = (
    key: keyof WelcomeBackDraft,
    v: number | undefined,
    lo: number,
    hi: number,
    label: string,
    required: boolean,
  ) => {
    if (v === undefined) {
      if (required) e[key] = `Enter your ${label}`;
    } else if (!Number.isFinite(v) || v < lo || v > hi) e[key] = `Enter ${label} between ${lo} and ${hi}`;
  };
  range("weightKg", num(d.weightKg), 30, 250, "weight", true);
  range("heightCm", num(d.heightCm), 120, 230, "height", true);
  range("waistCm", num(d.waistCm), 40, 200, "waist", bodyFatGoal);
  range("neckCm", num(d.neckCm), 20, 70, "neck", bodyFatGoal);
  range("hipCm", num(d.hipCm), 50, 200, "hip", false);
  return e;
}

/** Body of POST /api/welcome-back for a validated draft (hip only for women; at most 10 injuries). */
export function toWelcomeBackInput(d: WelcomeBackDraft, sex: Profile["sex"], timezone: string): WelcomeBackInput {
  return {
    weightKg: num(d.weightKg)!,
    heightCm: num(d.heightCm)!,
    waistCm: num(d.waistCm),
    neckCm: num(d.neckCm),
    hipCm: sex === "FEMALE" ? num(d.hipCm) : undefined,
    activityLevel: d.activityLevel,
    equipment: d.equipment,
    trainingDaysPerWeek: d.trainingDaysPerWeek,
    sessionMinutes: d.sessionMinutes,
    injuries: d.injuries
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10),
    medicalFlag: d.medicalFlag,
    timezone,
  };
}
