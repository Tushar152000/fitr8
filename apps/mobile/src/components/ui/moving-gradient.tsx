import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * The black → olive gradient behind gradient buttons and tiles, in three motions (user feedback
 * 2026-11-28: everything flowing at once was too much on Home):
 * - `glint` (default): the gradient stays still and a soft light sweeps across once every ~5 s.
 * - `flow`: the gradient itself moves diagonally forever (login "Sign Up For Free" only).
 * - `still`: no motion (Profile icon tiles).
 *
 * `flow` details: stripes repeat once
 * per box width along a strip tilted by ANGLE; the strip slides along its own length by one width,
 * so the loop has no jump. The strip is sized from the box's diagonal so the tilted strip covers any
 * shape (pill or tall card). Pass the size when it is known (login pill); otherwise it is measured.
 * A still gradient sits underneath, so the box is never blank, even before measuring. With Reduce
 * Motion on, it stays still.
 */
const BLACK = "#000000";
const OLIVE = "#536600";
const ANGLE = "-30deg";
const LOOP_MS = 3200;
/** Glint: the sweep takes GLINT_MS, then the button rests for GLINT_REST_MS. */
const GLINT_MS = 900;
const GLINT_REST_MS = 4200;

/** n stripe periods: black, olive, black, … evenly spaced (stops must be a tuple of ≥ 2). */
function stripes(n: number) {
  const colors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i <= 2 * n; i++) {
    colors.push(i % 2 ? OLIVE : BLACK);
    locations.push(i / (2 * n));
  }
  return { colors: colors as [string, string, ...string[]], locations: locations as [number, number, ...number[]] };
}

export function MovingGradient({
  width,
  height,
  motion = "glint",
}: {
  width?: number;
  height?: number;
  motion?: "glint" | "flow" | "still";
}) {
  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const w = width ?? measured.w;
  const h = height ?? measured.h;
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  const g = useSharedValue(0);
  const animate = !reduce && motion !== "still";

  useEffect(() => {
    if (!w || !animate) return;
    if (motion === "flow") {
      x.value = 0;
      x.value = withRepeat(withTiming(-w, { duration: LOOP_MS, easing: Easing.linear }), -1, false);
      return () => cancelAnimation(x);
    }
    g.value = 0;
    g.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: GLINT_MS, easing: Easing.inOut(Easing.quad) }),
          withDelay(GLINT_REST_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(g);
  }, [w, animate, motion, x, g]);

  // Glint band: a soft white stripe, tilted like the flow stripes, crossing from left to right.
  const band = Math.max(24, h * 1.1);
  const glint = useAnimatedStyle(() => ({
    transform: [{ translateX: -band * 2 + g.value * (w + band * 4) }, { rotate: ANGLE }],
  }));

  // Must cover the box's diagonal after sliding up to one width: length ≥ diagonal + 2 widths.
  const d = Math.hypot(w, h);
  const n = w > 0 ? Math.ceil((d + 2 * w) / w) : 1;
  const len = n * w;
  const { colors, locations } = stripes(n);

  const strip = useAnimatedStyle(() => ({ transform: [{ rotate: ANGLE }, { translateX: x.value }] }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={
        width === undefined || height === undefined
          ? (e) => setMeasured({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          : undefined
      }
    >
      <LinearGradient
        colors={[BLACK, OLIVE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {w > 0 && animate && motion === "glint" && (
        <Animated.View style={[styles.glint, { width: band, height: h * 3, top: -h }, glint]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {w > 0 && animate && motion === "flow" && (
        <Animated.View
          style={[styles.strip, { width: len, height: d, left: w / 2 - len / 2, top: h / 2 - d / 2 }, strip]}
        >
          <LinearGradient
            colors={colors}
            locations={locations}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { position: "absolute" },
  glint: { position: "absolute", left: 0 },
});
