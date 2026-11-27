import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/** Where along the card's bottom edge the leak runs from (0..1), near the "−" button side. */
const AT = 0.74;
/** How far the stream falls before it pools on the card below. */
const FALL = 56;
const TOTAL_MS = 2600;
/** A soft light band; stacked and moved down, it reads as water flowing in the stream. */
const SHEEN = ["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"] as const;

/**
 * The hydration card's drain (2026-11-28, user request: long press "−", a continuous leak, not
 * drops). One stream runs out of the card's bottom edge: it grows down to the card below, keeps
 * pouring (a gentle wobble, light running down inside it), pools into a spreading puddle with
 * ripples, then its tail breaks off and falls in and the puddle fades. Sits outside the card (over
 * the next card); `leak` is a counter — each change plays it once. Reduce Motion: nothing.
 */
export function LeakDrops({ leak, width, color }: { leak: number; width: number; color: string }) {
  const reduce = useReducedMotion();
  if (reduce || leak === 0 || width <= 0) return null;
  return <Stream key={leak} x={AT * width} color={color} />;
}

function Stream({ x, color }: { x: number; color: string }) {
  const t = useSharedValue(0);
  const flow = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: TOTAL_MS, easing: Easing.linear }));
    flow.set(withRepeat(withTiming(1, { duration: 420, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(flow);
  }, [t, flow]);

  // 0–0.18 grows down · 0.18–0.72 pours · 0.72–0.9 the tail breaks off and falls · then gone.
  const stream = useAnimatedStyle(() => {
    const p = t.get();
    const grow = Math.min(1, p / 0.18);
    const fallOff = p > 0.72 ? Math.min(1, (p - 0.72) / 0.18) : 0;
    const top = fallOff * FALL;
    const bottom = grow * FALL;
    const wobble = Math.sin(p * 40) * 0.6;
    return {
      opacity: p >= 0.9 ? 0 : 1,
      top,
      height: Math.max(0, bottom - top),
      width: 5 + Math.sin(p * 23) * 0.8,
      transform: [{ translateX: wobble }],
    };
  });
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateY: -20 + flow.get() * 20 }] }));
  const puddle = useAnimatedStyle(() => {
    const p = t.get();
    const spread = Math.min(1, Math.max(0, (p - 0.14) / 0.6));
    const fade = p > 0.85 ? Math.max(0, 1 - (p - 0.85) / 0.15) : 1;
    return {
      opacity: spread > 0 ? 0.55 * fade : 0,
      transform: [{ scaleX: 0.2 + spread * 1 }, { scaleY: 0.2 + spread * 0.8 }],
    };
  });

  return (
    <View style={styles.zone} pointerEvents="none">
      <Animated.View style={[styles.stream, { left: x - 2.5, backgroundColor: color }, stream]}>
        {/* Light running down inside the stream, so it reads as flowing. */}
        <Animated.View style={[styles.sheenWrap, sheen]}>
          {[0, 1, 2, 3].map((i) => (
            <LinearGradient
              key={i}
              colors={SHEEN}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ width: "100%", height: 20 }}
            />
          ))}
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.puddle, { left: x - 40, top: FALL - 6, backgroundColor: color }, puddle]} />
      {[0, 1, 2].map((i) => (
        <Ripple key={i} t={t} start={0.2 + i * 0.16} x={x} color={color} />
      ))}
    </View>
  );
}

/** A ring spreading out from where the stream lands, while it pours. */
function Ripple({ t, start, x, color }: { t: SharedValue<number>; start: number; x: number; color: string }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.set(withDelay(start * TOTAL_MS, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })));
  }, [r, start]);
  const style = useAnimatedStyle(() => ({
    opacity: r.get() > 0 && t.get() < 0.92 ? (1 - r.get()) * 0.8 : 0,
    transform: [{ scaleX: 0.4 + r.get() * 1.8 }, { scaleY: 0.4 + r.get() * 0.7 }],
  }));
  return <Animated.View style={[styles.ring, { left: x - 20, top: FALL - 5, borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  // From the card's bottom edge down over the gap and the top of the next card.
  zone: { position: "absolute", left: 0, right: 0, top: "100%", marginTop: -3, height: 90 },
  stream: { position: "absolute", borderRadius: 3, overflow: "hidden" },
  sheenWrap: { position: "absolute", left: 0, right: 0, top: 0 },
  puddle: { position: "absolute", width: 80, height: 12, borderRadius: 40 },
  ring: { position: "absolute", width: 40, height: 10, borderRadius: 20, borderWidth: 1.5 },
});
