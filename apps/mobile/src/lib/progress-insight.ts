import type { ProgressDto } from "@fitr8/contracts";
import { formatInt } from "@/lib/format";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} kg`;

/** Headline + one-line reason for the week, with the numbers behind it. Targets change only via recompute. */
export function progressInsight(p: ProgressDto) {
  const kcal = p.target ? `${formatInt(p.target.kcal)} kcal` : "your target";
  if (p.weeklyChange == null) {
    return {
      headline: `Targets stay at ${kcal}`,
      reason:
        p.points.length < 2
          ? "Weigh in once a week, same time of day. After two weekly check-ins we can compare your trend with the plan."
          : "Log a weigh-in this week and last week so we can compare your weekly trend with the plan.",
    };
  }
  const planned = p.plan.weeklyChangeKg;
  const actual = p.weeklyChange;
  const onTrack = Math.abs(actual - planned) <= 0.25;
  return {
    headline: onTrack ? `On track — targets stay at ${kcal}` : `Targets stay at ${kcal} for now`,
    reason: `${signed(actual)} this week vs ${Math.abs(planned) < 0.05 ? "a steady weight" : signed(planned)} planned (7-day averages).${
      onTrack ? "" : " One week is noisy — we'll look at the next check-in before changing anything."
    }`,
  };
}
