import type { HealthDailyInput, HealthPlatform, HealthSampleInput } from "@fitr8/contracts";

/** Whether the phone can give us health data at all. */
export type HealthAvailability =
  | "available"
  /** Android: Health Connect must be installed or updated from the Play Store. */
  | "needs_install"
  /** Web preview, Expo Go, an iPad without Health, an old Android. */
  | "unavailable";

/**
 * One health platform on the phone: Apple Health (HealthKit) or Health Connect. Read-only: FITR8
 * never writes to the user's health data.
 */
export interface HealthAdapter {
  platform: HealthPlatform;
  /** Name the user knows: "Apple Health" / "Health Connect". */
  label: string;
  availability(): Promise<HealthAvailability>;
  /**
   * Shows the system permission screen. Returns what was allowed (Health Connect) or what was
   * asked for (iPhone never says what the user allowed, for privacy). Empty = nothing allowed.
   */
  requestAccess(): Promise<string[]>;
  /** Every record of the types we read, normalised, between two instants. */
  read(from: Date, to: Date): Promise<HealthSampleInput[]>;
  /** De-duplicated daily totals (steps etc.) for local days starting at `firstDay` (local midnight). */
  daily(firstDay: Date, days: number): Promise<HealthDailyInput[]>;
  /** Opens the platform's own settings (to change or remove access). */
  openSettings(): void;
}
