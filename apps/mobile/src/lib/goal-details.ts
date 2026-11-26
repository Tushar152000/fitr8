import type { PlanDto, ProfileDto, ProgressDto } from "@fitr8/contracts";
import { ymdTime } from "@/lib/dates";

/** Labels and numbers for the Goal page (Figma frame 9 "Profile / Goal"). */

export const ACTIVITY_SHORT: Record<ProfileDto["activityLevel"], string> = {
  SEDENTARY: "Mostly sitting",
  LIGHT: "Light",
  MODERATE: "Moderate",
  VERY_ACTIVE: "Very active",
  ATHLETE: "Athlete",
};

export const DIET_LABEL: Record<ProfileDto["dietType"], string> = {
  VEG: "Veg",
  NON_VEG: "Non-veg",
  EGGETARIAN: "Eggetarian",
  VEGAN: "Vegan",
};

export const WHERE_LABEL: Record<ProfileDto["equipment"], string> = {
  FULL_GYM: "Gym",
  DUMBBELLS: "Home",
  BODYWEIGHT: "Anywhere",
};

export const EXPERIENCE_LABEL: Record<ProfileDto["experience"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const kg1 = (n: number) => `${n.toFixed(1)} kg`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Feb 2027", "Sep 2027": always a 3-letter month (en-IN's Intl writes "Sept"). Calendar date, UTC. */
export const monthYear = (date: string) => {
  const d = new Date(ymdTime(date));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** "23 Nov", "9 Sep" (3-letter month). */
export const dayMonth = (date: string) => {
  const d = new Date(ymdTime(date));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** Target weight row value: "70.0 kg", "18% body fat" or "Hold weight" (recomposition). */
export function targetLabel(goal: PlanDto["goal"]): string {
  if (goal.targetBodyFatPct != null) return `${goal.targetBodyFatPct}% body fat`;
  if (goal.targetWeightKg != null) return kg1(goal.targetWeightKg);
  return "Hold weight";
}

/**
 * The goal card's numbers: "75.0 kg → 70.0 kg · 0.5 kg / week" and the progress bar from the plan's
 * start weight to its target weight, measured at the newest weigh-in. `bar` is null when start and
 * target are the same weight (recomposition holds weight), where a bar would mean nothing.
 */
export function goalProgress(plan: PlanDto, progress: ProgressDto) {
  const start = progress.plan.startWeightKg;
  const target = plan.summary.plan.targetWeightKg;
  const now = progress.latest?.weightKg ?? plan.metric.weightKg;
  const pace = `${Math.abs(plan.summary.plan.weeklyChangeKg).toFixed(1)} kg / week`;
  const to =
    plan.goal.targetBodyFatPct != null
      ? `${plan.goal.targetBodyFatPct}% body fat`
      : plan.goal.targetWeightKg != null
        ? kg1(plan.goal.targetWeightKg)
        : null;
  const line = to ? `${kg1(start)} → ${to} · ${pace}` : `${kg1(start)} · hold weight`;

  const span = Math.abs(target - start);
  if (span < 0.05) return { line, bar: null };
  const losing = target < start;
  // Moving the wrong way counts as no progress yet (the bar never goes below empty).
  const done = Math.max(0, losing ? start - now : now - start);
  const left = Math.max(0, losing ? now - target : target - now);
  return {
    line,
    bar: {
      fraction: Math.min(1, done / span),
      done: `${done.toFixed(1)} kg ${losing ? "lost" : "gained"}`,
      left: left === 0 ? "Target reached" : `${left.toFixed(1)} kg to go`,
    },
  };
}
