import type { ProgressDto } from "@fitr8/contracts";

/** Labels for the Progress screen (Figma frame 10 "Profile / Progress"). */

/** "−1.2 kg", "+0.4 kg", "0.0 kg" (true minus sign, one decimal). */
export const signedKg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} kg`;

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** "This week", "Last week", "2 weeks ago" … */
export function weekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return "This week";
  if (weeksAgo === 1) return "Last week";
  return `${weeksAgo} weeks ago`;
}

/** The three stat tiles: weight + change since the plan's start, on-target share, best streak. */
export function progressTiles(p: ProgressDto) {
  const weight = p.latest?.weightKg ?? null;
  return [
    {
      label: "Weight",
      value: weight == null ? "—" : `${weight.toFixed(1)} kg`,
      caption: p.weightChangeKg == null ? "No weigh-in yet" : signedKg(p.weightChangeKg),
    },
    {
      label: "On target",
      value: p.onTarget.pct == null ? "—" : `${p.onTarget.pct}%`,
      caption: p.onTarget.pct == null ? "No days yet" : "of days",
    },
    { label: "Best streak", value: days(p.streak.longest), caption: `${p.streak.current} now` },
  ];
}

/** The weekly check-ins list, newest first: only weeks that have a weigh-in. */
export function checkinRows(weeks: ProgressDto["weeks"]) {
  return weeks
    .filter((w): w is typeof w & { date: string; weightKg: number } => w.date != null && w.weightKg != null)
    .sort((a, b) => a.weeksAgo - b.weeksAgo);
}
