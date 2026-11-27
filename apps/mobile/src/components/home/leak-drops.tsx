import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/** Drops per leak: where across the card (0..1), how long after the start, how far they fall. */
const DROPS = [
  { x: 0.18, delay: 0, fall: 46, size: 7 },
  { x: 0.34, delay: 140, fall: 54, size: 9 },
  { x: 0.52, delay: 60, fall: 50, size: 8 },
  { x: 0.67, delay: 220, fall: 58, size: 10 },
  { x: 0.83, delay: 110, fall: 44, size: 7 },
  { x: 0.44, delay: 330, fall: 52, size: 6 },
] as const;
const FALL_MS = 620;
const SPLASH_MS = 520;

/**
 * The hydration card's drain (2026-11-28, user request: long press "−"): drops leak out of the
 * card's bottom edge, fall into the gap below and land on the next card with small splash ripples,
 * as if the water is leaking out of the card. Sits outside the card (overflow visible, over the
 * next card); `leak` is a counter — each change plays it once. Reduce Motion: nothing.
 */
export function LeakDrops({ leak, width, color }: { leak: number; width: number; color: string }) {
  const reduce = useReducedMotion();
  if (reduce || leak === 0 || width <= 0) return null;
  return (
    <View style={styles.zone} pointerEvents="none">
      {DROPS.map((d, i) => (
        <Drop key={`${leak}-${i}`} drop={d} width={width} color={color} />
      ))}
    </View>
  );
}

function Drop({ drop, width, color }: { drop: (typeof DROPS)[number]; width: number; color: string }) {
  const t = useSharedValue(0);
  const s = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(drop.delay, withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) })));
    s.set(
      withDelay(drop.delay + FALL_MS - 40, withTiming(1, { duration: SPLASH_MS, easing: Easing.out(Easing.quad) })),
    );
  }, [t, s, drop.delay]);

  const left = drop.x * width - drop.size / 2;
  const fall = useAnimatedStyle(() => ({
    opacity: t.get() > 0 && t.get() < 1 ? 1 : 0,
    // Stretches as it speeds up, like a falling drop.
    transform: [{ translateY: t.get() * drop.fall }, { scaleY: 1 + t.get() * 0.5 }, { scaleX: 1 - t.get() * 0.15 }],
  }));
  return (
    <>
      <Animated.View
        style={[
          styles.drop,
          { left, width: drop.size, height: drop.size * 1.3, borderRadius: drop.size / 2, backgroundColor: color },
          fall,
        ]}
      />
      <Splash progress={s} left={drop.x * width} top={drop.fall + drop.size} color={color} />
    </>
  );
}

/** Where a drop lands: a flat ring spreading out and fading, plus a tiny bounce droplet. */
function Splash({
  progress,
  left,
  top,
  color,
}: {
  progress: SharedValue<number>;
  left: number;
  top: number;
  color: string;
}) {
  const ring = useAnimatedStyle(() => ({
    opacity: progress.get() > 0 ? (1 - progress.get()) * 0.8 : 0,
    transform: [{ scaleX: 0.3 + progress.get() * 1.4 }, { scaleY: 0.3 + progress.get() * 0.5 }],
  }));
  const bounce = useAnimatedStyle(() => ({
    opacity: progress.get() > 0 && progress.get() < 0.7 ? 1 - progress.get() / 0.7 : 0,
    transform: [{ translateY: -Math.sin(progress.get() * Math.PI) * 10 }],
  }));
  return (
    <>
      <Animated.View style={[styles.ring, { left: left - 14, top: top - 4, borderColor: color }, ring]} />
      <Animated.View style={[styles.bounce, { left: left - 2, top: top - 4, backgroundColor: color }, bounce]} />
    </>
  );
}

const styles = StyleSheet.create({
  // From the card's bottom edge down over the gap and the top of the next card.
  zone: { position: "absolute", left: 0, right: 0, top: "100%", marginTop: -4, height: 80 },
  drop: { position: "absolute", top: 0 },
  ring: { position: "absolute", width: 28, height: 8, borderRadius: 14, borderWidth: 1.5 },
  bounce: { position: "absolute", width: 4, height: 4, borderRadius: 2 },
});
