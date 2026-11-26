import type { HealthConnectionDto, HealthStatusDto } from "@fitr8/contracts";
import { Platform } from "react-native";
import { healthAdapter } from "@/lib/health";

export const HEALTH_PLATFORM_NAME = { APPLE_HEALTH: "Apple Health", HEALTH_CONNECT: "Health Connect" } as const;

/** This phone's health app by name; the web preview (no adapter) names both. */
export function healthAppLabel(): string {
  const adapter = healthAdapter();
  if (adapter) return adapter.label;
  if (Platform.OS === "ios") return "Apple Health";
  if (Platform.OS === "android") return "Health Connect";
  return "Apple Health / Health Connect";
}

/**
 * The connection that counts on this device: this phone's platform; on the web preview (no
 * adapter) whichever platform the account connected from a phone.
 */
export function healthConnection(status: HealthStatusDto | undefined): HealthConnectionDto | undefined {
  const own = healthAdapter()?.platform;
  return status?.connections.find((x) => (own ? x.platform === own : true));
}
