/**
 * The pace line under Now → Goal. A directional goal with no weight change (target equals current
 * weight, or a medical / under-18 hold) reads as words, never "0 kg a week".
 */
export function paceLine(weekly: number, nowKg: number, targetKg: number): { text: string; atTarget: boolean } {
  if (Math.abs(weekly) >= 0.05) {
    return { text: `${weekly > 0 ? "+" : "−"}${Math.abs(weekly)} kg a week`, atTarget: false };
  }
  if (Math.abs(targetKg - nowKg) < 0.5) {
    return {
      text: "You're already at your target weight, so there's no weight to change. Your plan keeps it steady.",
      atTarget: true,
    };
  }
  return { text: "Your weight stays steady for now.", atTarget: false };
}
