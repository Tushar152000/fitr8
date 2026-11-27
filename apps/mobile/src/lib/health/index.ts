import { NativeModules, Platform, TurboModuleRegistry } from "react-native";
import type { HealthAdapter } from "./types";

export type { HealthAdapter, HealthAvailability } from "./types";

let cached: HealthAdapter | null | undefined;

/** A native module is in this build (new architecture first, then the old bridge). */
const hasNative = (name: string) => Boolean(TurboModuleRegistry.get(name) ?? NativeModules[name]);

/**
 * Whether this build has the health library's native code. Expo Go never does, and a development
 * build made before the libraries were added doesn't either. Checking first means the library is
 * never imported there: Apple Health's library runs on Nitro, which throws "Failed to get
 * NitroModules" the moment it's imported without its native module (and on SDK 58 it can't tell it
 * is in Expo Go); Health Connect's `getEnforcing("HealthConnect")` throws the same way.
 */
function nativeHealthPossible(): boolean {
  if (Platform.OS === "ios") return hasNative("NitroModules");
  if (Platform.OS === "android") return hasNative("HealthConnect");
  return false;
}

/**
 * The phone's health platform: Apple Health on iPhone, Health Connect on Android, none on the web
 * preview. Loaded lazily so the native module is only touched on its own platform; a build without
 * it (Expo Go, an older development build) gets null without loading the library.
 */
export function healthAdapter(): HealthAdapter | null {
  if (cached !== undefined) return cached;
  if (!nativeHealthPossible()) {
    cached = null;
    return cached;
  }
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
