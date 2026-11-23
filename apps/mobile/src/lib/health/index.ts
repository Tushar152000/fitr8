import { Platform } from "react-native";
import type { HealthAdapter } from "./types";

export type { HealthAdapter, HealthAvailability } from "./types";

let cached: HealthAdapter | null | undefined;

/**
 * The phone's health platform: Apple Health on iPhone, Health Connect on Android, none on the web
 * preview. Loaded lazily so the native module is only touched on its own platform (and a build
 * without it, such as Expo Go, just reports "unavailable").
 */
export function healthAdapter(): HealthAdapter | null {
  if (cached !== undefined) return cached;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports -- lazy on purpose: each native module loads only on its platform */
    if (Platform.OS === "ios") cached = (require("./healthkit") as typeof import("./healthkit")).healthKit;
    else if (Platform.OS === "android")
      cached = (require("./health-connect") as typeof import("./health-connect")).healthConnect;
    else cached = null;
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    cached = null;
  }
  return cached;
}

/** Analytics label for a platform (no values ever). */
export const platformLabel = (p: HealthAdapter["platform"]) =>
  p === "APPLE_HEALTH" ? ("apple_health" as const) : ("health_connect" as const);
