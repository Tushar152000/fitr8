import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Haptic feedback for the moments that matter (docs/DESIGN.md "Motion"): kept rare so each one
 * means something. Fire-and-forget: phones without a haptic engine, the web preview, and app builds
 * from before expo-haptics was added (an OTA update reaching an older binary) simply skip it.
 */
const run = (fn: () => Promise<void>) => {
  if (Platform.OS === "web") return;
  try {
    fn().catch(() => {});
  } catch {
    // Native module missing in this build.
  }
};

export const haptic = {
  /** A choice moved: tab change, switch, segmented control, picker chip. */
  select: () => run(() => Haptics.selectionAsync()),
  /** A light physical tap: a glass of water added. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Something taken back: undo a glass, remove an item. */
  soft: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** A long press registered. */
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A goal reached or a save that took effort: meal logged, water target, check-in saved. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Before something destructive (delete, log out). */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** A save failed. */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
