import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { Easing, FadeIn, FadeInDown, FadeInUp, FadeOut, FadeOutUp, LinearTransition } from "react-native-reanimated";

/**
 * Use the native animation driver on phones. The web preview has none, and there
 * `Animated.loop` with the native driver runs only once.
 */
export const NATIVE_DRIVER = Platform.OS !== "web";

/**
 * Motion (docs/DESIGN.md "Motion"): one feel across the app. Screens slide in from the right
 * (Android uses the iOS-style push, which reads smoother than the default zoom); modals rise from
 * the bottom; tab switches cross-fade. Component animations are short and ease out, and follow the
 * phone's "reduce motion" setting (Reanimated's default).
 */
export const stackMotion =
  Platform.OS === "web"
    ? // components/app-stack.tsx: the JS stack on the web; slides in from the right, out on close.
      { animation: "slide_from_right" as const, gestureEnabled: false }
    : {
        animation: Platform.OS === "android" ? ("ios_from_right" as const) : ("default" as const),
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      };

export const modalMotion = {
  presentation: "modal" as const,
  animation: Platform.OS === "ios" ? ("default" as const) : ("slide_from_bottom" as const),
};

/**
 * A stack's screen background: `contentStyle` for the native stack, `cardStyle` for the web's JS
 * stack (components/app-stack.tsx), so no screen flashes another colour while it slides. On the web
 * it also pins the screen to the window's height so each screen's own ScrollView scrolls.
 */
export function stackBackground(color: string) {
  return {
    contentStyle: { backgroundColor: color },
    ...(Platform.OS === "web"
      ? // flex 1: the JS stack otherwise lets a screen grow past the window (it expects the page to
        // scroll) and the screen's own ScrollView never scrolls.
        { cardStyle: { flex: 1, backgroundColor: color } }
      : {}),
  } as {
    contentStyle: { backgroundColor: string };
  };
}

export const tabMotion = { animation: "fade" as const };

const easeOut = Easing.out(Easing.cubic);

/** Something appearing in place (a banner, a card): a short fade up. */
export const appear = FadeInDown.duration(240).easing(easeOut);
/** Something leaving in place. */
export const disappear = FadeOut.duration(160);
/** Content revealed by a tap (an accordion row). */
export const reveal = FadeIn.duration(180).easing(easeOut);
/** Bottom sheet (components/sheet.tsx): open = rise + backdrop fade-in, close = the same in reverse. */
export const SHEET_OPEN = { duration: 280, easing: easeOut };
export const SHEET_CLOSE = { duration: 220, easing: Easing.in(Easing.cubic) };
/** A toast dropping in and out at the top. */
export const toastIn = FadeInUp.duration(220).easing(easeOut);
export const toastOut = FadeOutUp.duration(180);
/** Loaded content replacing its skeleton: a quick cross-fade so the swap never hard-cuts. */
export const contentIn = FadeIn.duration(180).easing(easeOut);
/** Rows in a list that grows or shrinks: new rows fade up, removed rows fade, the rest slide. */
export const listLayout = LinearTransition.duration(200).easing(easeOut);
/** A chat bubble arriving. No layout transition: it would fight the scroll to the end. */
export const bubbleIn = FadeInDown.duration(180).easing(easeOut);

/** Press feedback (docs/DESIGN.md "Motion"): controls sink to 98 % for 120 ms. */
export const PRESS_SCALE = 0.98;
export const PRESS_MS = 120;
/** Value changes on rings and bars. */
export const VALUE_MS = 220;

/**
 * The phone's Reduce Motion setting, kept live. Reanimated layout animations and `withTiming`
 * follow it on their own; RN `Animated` loops (skeleton sweep, scan line, pulse) must check this.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
