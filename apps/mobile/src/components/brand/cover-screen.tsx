import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { useScheme } from "@/lib/theme";
import { ShiningWordmark } from "./shining-wordmark";

/**
 * The launch cover: the FITR8 wordmark in the middle of a plain background matching the native
 * splash — white in light mode, #0c0c0c in dark (both simplified 2026-11-28 from the Figma
 * gradients) — so app open, reload and refresh look the same.
 */
/**
 * Light: plain white, the same as the native light splash, so opening, reloading and refreshing all
 * look the same (user request 2026-11-28, matching the simple dark cover; was a white → olive
 * Figma gradient).
 */
const LIGHT = {
  colors: ["#ffffff", "#ffffff"] as const,
  locations: [0, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};
/**
 * Dark: plain #0c0c0c, the same as the native dark splash, so launch → cover is seamless (user
 * request 2026-11-28: dark loading "more good and simple"; was a black → olive gradient).
 */
const DARK = {
  colors: ["#0c0c0c", "#0c0c0c"] as const,
  locations: [0, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};
const LIME = "#C2E04A";
const OLIVE = "#718b00";

/** The intro plays at least this long once the app is ready, so it's never cut off mid-sweep. */
const MIN_MS = 1150;
const FADE_MS = 420;
/** Still loading after this: the thin loading bar fades in under the wordmark. */
const BAR_AFTER_MS = 1200;
/** The phone's launch screen draws the wordmark 150 wide (Android's splash icon area); the cover grows it to Figma's 185. */
const NATIVE_WIDTH = 150;
const W = 185;

/**
 * The cover the app opens on (user decision 2026-11-27; intro animation user request 2026-11-28):
 * it follows the phone's theme and sits over everything while fonts load and the session is checked
 * (`ready`). It starts exactly like the native splash (wordmark 150 wide), then the wordmark grows
 * to 185, a lime light sweeps across it (clipped to the letters) and a soft lime glow pulses behind.
 * Still loading after 1.2 s: a thin bar loops under it. Exit: the wordmark zooms forward a little
 * while the cover fades. `onShown` is called once it has drawn, so the native splash can hide behind
 * it without a flash. Reduce Motion: no intro, a plain fade.
 */
export function CoverScreen({ ready, onShown }: { ready: boolean; onShown: () => void }) {
  const dark = useScheme() === "dark";
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const [shownAt] = useState(() => Date.now());
  const opacity = useSharedValue(1);
  const grow = useSharedValue(reduce ? 1 : NATIVE_WIDTH / W);
  const exit = useSharedValue(0);
  const glow = useSharedValue(0);
  const bar = useSharedValue(0);
  const barIn = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    grow.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    glow.set(
      withDelay(
        300,
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
          withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        ),
      ),
    );
    bar.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, false));
    barIn.set(withDelay(BAR_AFTER_MS, withTiming(1, { duration: 250 })));
  }, [reduce, grow, glow, bar, barIn]);

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, (reduce ? 0 : MIN_MS) - (Date.now() - shownAt));
    const t = setTimeout(() => {
      barIn.set(withTiming(0, { duration: 150 }));
      exit.set(withTiming(1, { duration: reduce ? 0 : FADE_MS, easing: Easing.in(Easing.quad) }));
      opacity.set(
        withTiming(0, { duration: reduce ? 0 : FADE_MS, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(setGone, true);
        }),
      );
    }, wait);
    return () => clearTimeout(t);
  }, [ready, reduce, shownAt, opacity, exit, barIn]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: grow.get() * (1 + exit.get() * 0.12) }] }));
  const halo = useAnimatedStyle(() => ({
    // Dark: only a faint lime glow, so the white wordmark stays the one thing you see.
    opacity: glow.get() * (dark ? 0.16 : 0.2),
    transform: [{ scale: 0.7 + glow.get() * 0.5 }],
  }));
  const barTrack = useAnimatedStyle(() => ({ opacity: barIn.get() }));
  const barRun = useAnimatedStyle(() => ({ transform: [{ translateX: -28 + bar.get() * 84 }] }));

  if (gone) return null;
  const g = dark ? DARK : LIGHT;
  const ink = dark ? "#ffffff" : "#000000";
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

      {/* Soft lime glow behind the wordmark. */}
      <Animated.View style={[styles.halo, halo]} pointerEvents="none">
        <Svg width={320} height={320}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={LIME} stopOpacity={1} />
              <Stop offset="0.45" stopColor={LIME} stopOpacity={0.35} />
              <Stop offset="1" stopColor={LIME} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={320} height={320} fill="url(#halo)" />
        </Svg>
      </Animated.View>

      <Animated.View style={mark}>
        <ShiningWordmark ink={ink} onDark={dark} delayMs={380} play={!reduce} />
      </Animated.View>

      {/* Loading bar: only when start-up takes a while. */}
      <Animated.View
        style={[styles.bar, { backgroundColor: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)" }, barTrack]}
      >
        <Animated.View style={[styles.barRun, { backgroundColor: dark ? "rgba(255,255,255,0.85)" : OLIVE }, barRun]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", zIndex: 100 },
  halo: { position: "absolute", width: 320, height: 320 },
  bar: { position: "absolute", top: "50%", marginTop: 44, width: 56, height: 3, borderRadius: 2, overflow: "hidden" },
  barRun: { width: 28, height: 3, borderRadius: 2 },
});
