import type { PlanDto, ProfileDto, ProgressDto } from "@fitr8/contracts";
import { formatYmd } from "@/lib/dates";
import { PHONE_COUNTRIES, splitPhone } from "@/lib/person";

/** One-line summaries for the Profile hub rows (Figma frame 8), from data the app already has. */

export const GOAL_LABEL = {
  FAT_LOSS: "Lose fat",
  MUSCLE_GAIN: "Build muscle",
  RECOMPOSITION: "Recomposition",
} as const;

/** en-IN's short month for September is "Sept"; Figma uses three letters throughout ("Sep"). */
export const threeLetterMonths = (label: string) => label.replace(/\bSept\b/, "Sep");

/** "Feb 2027". */
export const monthYear = (date: string) => threeLetterMonths(formatYmd(date, { month: "short", year: "numeric" }));

/** "Lose fat · 70.0 kg by Feb 2027" (or the body-fat target, or "hold weight" for recomposition). */
export function goalSummary(goal: PlanDto["goal"] | undefined): string | null {
  if (!goal) return null;
  const by = `by ${monthYear(goal.targetDate)}`;
  const target =
    goal.targetBodyFatPct != null
      ? `${goal.targetBodyFatPct}% body fat ${by}`
      : goal.targetWeightKg != null
        ? `${goal.targetWeightKg.toFixed(1)} kg ${by}`
        : `hold weight ${by}`;
  return `${GOAL_LABEL[goal.type]} · ${target}`;
}

const signedKg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} kg`;

/**
 * Figma "−1.2 kg so far · 86% on target": the newest weigh-in against the plan's start weight
 * (`weightChangeKg`), and the share of logged days that were on target (left out while null).
 */
export function progressSummary(p: ProgressDto | undefined): string | null {
  if (!p) return null;
  const parts: string[] = [];
  parts.push(p.weightChangeKg == null ? "No weigh-in yet" : `${signedKg(p.weightChangeKg)} so far`);
  if (p.onTarget.pct != null) parts.push(`${p.onTarget.pct}% on target`);
  return parts.join(" · ");
}

/** The built-in reminder switches that are on (meals, water, weekly weigh-in), as "2 of 3 on". */
export function remindersSummary(profile: ProfileDto): string {
  const switches = [profile.remindMeals, profile.remindWater, profile.remindWeighIn];
  return `${switches.filter(Boolean).length} of ${switches.length} on`;
}

/** "+919876543210" → "+91 98765 43210"; other countries "+44 7911123456". */
export function formatPhone(e164: string | null | undefined): string | null {
  if (!e164) return null;
  const { country, national } = splitPhone(e164);
  const dial = PHONE_COUNTRIES.find((c) => c.iso === country)?.dial;
  if (!dial || !national) return e164;
  if (dial === "91" && national.length === 10) return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  return `+${dial} ${national}`;
}
