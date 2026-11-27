import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useReduceMotion } from "@/lib/motion";

/** A flame tongue in a 100 × 130 box, tip at the top, round base at the bottom. */
const TONGUE =
  "M50 0 C60 26 90 46 90 84 C90 110 72 130 50 130 C28 130 10 110 10 84 C10 52 34 40 42 18 C46 30 48 22 50 0 Z";

/** How hard it burns: `ember` = low and slow (no streak), `burn` = a streak, `blaze` = a personal best. */
export type FireLevel = "ember" | "burn" | "blaze";

const LEVEL = {
  ember: { amp: 0.35, speed: 0.45, height: 0.78 },
  burn: { amp: 1, speed: 1, height: 1 },
  blaze: { amp: 1.35, speed: 1.25, height: 1.12 },
} as const;

/** Layers from back to front: colour (bottom → tip), size, timing and phase so they move out of step. */
const LAYERS = [
  { from: "#718b00", to: "#C2E04A", scale: 1, freq: 1.0, phase: 0, sway: 7 },
  { from: "#C2E04A", to: "#E9F7A6", scale: 0.7, freq: 1.6, phase: 0.33, sway: 9 },
  { from: "#FFF3B0", to: "#FFFFFF", scale: 0.4, freq: 2.3, phase: 0.61, sway: 11 },
] as const;

/**
 * A live fire drawn with three SVG flame tongues (user request 2026-11-28: the streak flame should
 * really burn, not just move a picture). Each tongue stretches, narrows and sways from its base on
 * its own rhythm off one shared clock, so the fire licks upward. `level` sets height, speed and
 * movement. Reduce Motion: a still fire.
 */
export function LiveFire({ width, height, level = "burn" }: { width: number; height: number; level?: FireLevel }) {
  const reduce = useReduceMotion();
  const clock = useSharedValue(0);
  const cfg = LEVEL[level];

  useEffect(() => {
    if (reduce) return;
    clock.set(0);
    clock.set(withRepeat(withTiming(1, { duration: 1400 / cfg.speed, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [reduce, cfg.speed, clock]);

  return (
    <View style={{ width, height }} pointerEvents="none">
      {LAYERS.map((l, i) => (
        <Tongue
          key={i}
          index={i}
          layer={l}
          width={width}
          height={height}
          clock={clock}
          amp={cfg.amp}
          tall={cfg.height}
        />
      ))}
    </View>
  );
}

function Tongue({
  index,
  layer,
  width,
  height,
  clock,
  amp,
  tall,
}: {
  index: number;
  layer: (typeof LAYERS)[number];
  width: number;
  height: number;
  clock: SharedValue<number>;
  amp: number;
  tall: number;
}) {
  const w = width * layer.scale;
  const h = height * layer.scale * tall;
  const style = useAnimatedStyle(() => {
    const a = 2 * Math.PI * (clock.get() * layer.freq + layer.phase);
    // Two frequencies mixed so it never looks like a simple pulse.
    const stretch = Math.sin(a) * 0.09 + Math.sin(a * 2.7 + 1.3) * 0.05;
    const sway = Math.sin(a * 0.8 + 0.6) * layer.sway + Math.sin(a * 2.1) * 2;
    return {
      transformOrigin: "50% 100%",
      transform: [{ scaleY: 1 + stretch * amp }, { scaleX: 1 - stretch * 0.6 * amp }, { skewX: `${sway * amp}deg` }],
      opacity: index === 2 ? 0.85 + Math.sin(a * 3.1) * 0.15 * amp : 1,
    };
  });
  const id = `fire-${index}`;
  return (
    <Animated.View style={[styles.tongue, { width: w, height: h, left: (width - w) / 2, bottom: 0 }, style]}>
      <Svg width={w} height={h} viewBox="0 0 100 130" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={layer.from} />
            <Stop offset="1" stopColor={layer.to} />
          </LinearGradient>
        </Defs>
        <Path d={TONGUE} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ tongue: { position: "absolute" } });
