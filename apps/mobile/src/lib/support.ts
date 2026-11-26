import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import { showToast } from "@/lib/toast";

/** The documented contact address (same as the website, apps/web …/_components/contact.ts). */
export const SUPPORT_EMAIL = "askfitr8@gmail.com";

/** The app version from app config ("0.5.0"), for the Profile footer and feedback. */
export const appVersion = (): string | undefined => Constants.expoConfig?.version ?? undefined;

/** The platform field of POST /api/feedback. */
export const feedbackPlatform = (): "ios" | "android" | "web" =>
  Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

/**
 * Help & support → "Chat with support": a new email to the team with the app version and platform
 * filled in. Without a mail app, a toast shows the address instead.
 */
export async function emailSupport() {
  const subject = encodeURIComponent("FITR8 support");
  const body = encodeURIComponent(`\n\n—\nFITR8 ${appVersion() ?? ""} · ${feedbackPlatform()}`);
  try {
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  } catch {
    showToast(`Email us at ${SUPPORT_EMAIL}`, 3000, true);
  }
}
