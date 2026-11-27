import type { HealthSummaryDto } from "@fitr8/contracts";

/**
 * Made-up numbers for previewing the Home "Health" section in development builds only (Expo Go,
 * local runs: `__DEV__`), where Apple Health / Health Connect isn't connected. Never shown in a
 * store build: docs/HEALTH.md, and showing invented health values to real users would mislead.
 */
export function sampleHealthSummary(): HealthSummaryDto {
  /** Local YYYY-MM-DD, `back` days ago. */
  const day = (back: number) => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const today = day(0);
  const at = (h: number, m = 0) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const weekCounts = [8420, 10210, 6930, 11840, 9120, 7680, 6248];
  return {
    date: today,
    connected: true,
    lastSyncAt: new Date().toISOString(),
    steps: {
      count: 6248,
      goal: 10000,
      week: weekCounts.map((count, i) => ({ date: day(6 - i), count })),
    },
    heartRate: { avg: 74, min: 58, max: 128, resting: 61, latest: { bpm: 72, at: at(9, 40) } },
    bmi: { value: 23.4, category: "normal", weightKg: 72.5, heightCm: 176, weightFrom: "fitr8" },
    spo2: { avg: 97, min: 94, latest: 98, at: at(7, 15) },
    sleep: {
      asleepMinutes: 442,
      inBedMinutes: 478,
      start: new Date(Date.parse(at(7, 10)) - 478 * 60_000).toISOString(),
      end: at(7, 10),
      deepMinutes: 86,
      remMinutes: 104,
      lightMinutes: 252,
      awakeMinutes: 36,
    },
    recovery: {
      score: 78,
      level: "ready",
      reasons: ["Slept 7 h 22 m", "Resting heart rate below your average"],
      basis: ["sleep", "resting_hr"],
    },
  };
}
