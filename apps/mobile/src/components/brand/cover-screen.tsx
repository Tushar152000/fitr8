import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useScheme } from "@/lib/theme";
import { Wordmark } from "./wordmark";

/**
 * Figma cover frames (light "iPhone 13 & 14 - 27" / dark "- 20"): a full-screen gradient with the
 * FITR8 wordmark in the middle. Exact CSS from Figma, projected onto the 390 × 844 frame:
 * light 142.97° white (62.6 %) → olive #718b00 (193.4 %, so the corner reaches #d6deb6);
 * dark 180.64° #0c0c0c (69 %) → olive (110.9 %, corner #576a03).
 */
const LIGHT = {
  colors: ["#ffffff", "#ffffff", "#d6deb6"] as const,
  locations: [0, 0.626, 1] as const,
  start: { x: -0.2016, y: 0.0703 },
  end: { x: 1.2016, y: 0.9297 },
};
const DARK = {
  colors: ["#0c0c0c", "#0c0c0c", "#576a03"] as const,
  locations: [0, 0.69, 1] as const,
  start: { x: 0.5122, y: -0.0025 },
  end: { x: 0.4878, y: 1.0025 },
};
/** Shown at least this long once the app is ready, so the cover never flashes. */
const MIN_MS = 700;
const FADE_MS = 350;
/** The phone's launch screen draws the wordmark 150 wide (Android's splash icon area); the cover grows it to Figma's 185. */
const NATIVE_WIDTH = 150;

/**
 * The cover the app opens on (user decision 2026-11-27): it follows the phone's theme, sits over
 * everything while fonts load and the session is checked (`ready`), then fades out. `onShown` is
 * called once it has drawn, so the native splash can hide behind it without a flash.
 */
export function CoverScreen({ ready, onShown }: { ready: boolean; onShown: () => void }) {
  const dark = useScheme() === "dark";
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const [shownAt] = useState(() => Date.now());
  const opacity = useSharedValue(1);
  const grow = useSharedValue(reduce ? 1 : NATIVE_WIDTH / 185);

  useEffect(() => {
    if (!reduce) grow.set(withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [reduce, grow]);

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, MIN_MS - (Date.now() - shownAt));
    const t = setTimeout(() => {
      opacity.set(
        withTiming(0, { duration: reduce ? 0 : FADE_MS, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(setGone, true);
        }),
      );
    }, wait);
    return () => clearTimeout(t);
  }, [ready, reduce, shownAt, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: grow.get() }] }));
  if (gone) return null;
  const g = dark ? DARK : LIGHT;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.center, { pointerEvents: ready ? "none" : "auto" }, fade]}
      onLayout={onShown}
      accessibilityLabel="FITR8"
    >
      <LinearGradient
        colors={g.colors}
        locations={g.locations}
        start={g.start}
        end={g.end}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={mark}>
        <Wordmark color={dark ? "#ffffff" : "#000000"} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: "center", justifyContent: "center", zIndex: 100 } });
