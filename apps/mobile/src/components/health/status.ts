import type { HealthConnectionDto, HealthStatusDto } from "@fitr8/contracts";
import { Platform } from "react-native";
import { healthAdapter } from "@/lib/health";

export const HEALTH_PLATFORM_NAME = { APPLE_HEALTH: "Apple Health", HEALTH_CONNECT: "Health Connect" } as const;

/**
 * This platform's health app by name, for copy: Apple Health on iPhone, Health Connect on Android,
 * both only on the web preview. A phone never names the other platform's app (user decision
 * 2026-11-27).
 */
export const PLATFORM_HEALTH_APP =
  Platform.OS === "ios"
    ? "Apple Health"
    : Platform.OS === "android"
      ? "Health Connect"
      : "Apple Health / Health Connect";
/** This platform's app store, for copy (both on the web preview). */
export const PLATFORM_STORE =
  Platform.OS === "ios" ? "the App Store" : Platform.OS === "android" ? "Google Play" : "the App Store or Google Play";

/** This phone's health app by name; the web preview (no adapter) names both. */
export function healthAppLabel(): string {
  const adapter = healthAdapter();
  if (adapter) return adapter.label;
  if (Platform.OS === "ios") return "Apple Health";
  if (Platform.OS === "android") return "Health Connect";
  return "Apple Health / Health Connect";
}

/**
 * The connection that counts on this device: this phone's platform; on the web preview whichever
 * platform the account connected from a phone.
 */
export function healthConnection(status: HealthStatusDto | undefined): HealthConnectionDto | undefined {
  // A phone only ever counts its own platform's connection, even without the native module (an
  // older build): an Android phone never shows "Apple Health connected", and vice versa.
  const own =
    healthAdapter()?.platform ??
    (Platform.OS === "ios" ? "APPLE_HEALTH" : Platform.OS === "android" ? "HEALTH_CONNECT" : undefined);
  return status?.connections.find((x) => (own ? x.platform === own : true));
}
