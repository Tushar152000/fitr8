/**
 * (UI-only.) When the workout unlock banner (design 16) shows on Today for a free user: every day
 * for its first 7 days, then every other day unless it was tapped. Dates are local "YYYY-MM-DD".
 */
import { addDaysYmd } from "./premium-banner";

export interface WorkoutBannerState {
  /** First day it was shown on this phone. */
  firstSeen: string | null;
  tapped: boolean;
}

export const NEW_WORKOUT_BANNER: WorkoutBannerState = { firstSeen: null, tapped: false };
export const WORKOUT_BANNER_DAILY_DAYS = 7;

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function workoutBannerVisible(s: WorkoutBannerState, today: string): boolean {
  if (!s.firstSeen || s.tapped) return true;
  const days = daysBetween(s.firstSeen, today);
  if (days < WORKOUT_BANNER_DAILY_DAYS) return true;
  return (days - WORKOUT_BANNER_DAILY_DAYS) % 2 === 0;
}

export { addDaysYmd };
