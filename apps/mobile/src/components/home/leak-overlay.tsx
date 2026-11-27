import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useSyncExternalStore } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/**
 * The hydration drain as a screen-wide leak (2026-11-28, user request: from the card's bottom-right
 * corner all the way down to the tab bar). `startLeak({ x, y, color })` (window point of the
 * corner) plays it once; `<LeakOverlay />` is mounted once at the root, above every screen and the
 * tab bar. Made to look real (user, 2026-11-28): water gathers in a bulge on the card's lip, falls
 * as one tapered stream (wider at the top, thinner as it speeds up; light running down it) whose
 * end breaks into droplets, pools along the top of the tab bar's pill with ripples, then dries up
 * (thins, its top falls away) and the pool fades. Reduce Motion: nothing.
 */
type Leak = { id: number; x: number; y: number; color: string } | null;

let state: Leak = null;
const listeners = new Set<() => void>();
const set = (next: Leak) => {
  state = next;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const clearLeak = () => set(null);

export function startLeak(at: { x: number; y: number; color: string }) {
  set({ id: Date.now(), ...at });
}

/** The tab bar's pill: 60 px tall, sitting max(24, safe area − 10) above the screen bottom (tab-bar.tsx). */
const PILL = 60;
/** Speed the stream's front falls at, px per ms, and how long it keeps pouring once it lands. */
const FALL_SPEED = 0.9;
const POUR_MS = 1500;
const TAIL_MS = 450;
const FADE_MS = 600;
/** Half the SVG canvas width around the stream's centre line. */
const SVG_PAD = 10;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const SHEEN = ["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"] as const;

export function LeakOverlay() {
  const leak = useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
  const reduce = useReducedMotion();
  if (!leak || reduce) return null;
  return <Run key={leak.id} leak={leak} />;
}

function Run({ leak }: { leak: NonNullable<Leak> }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barTop = height - Math.max(24, insets.bottom - 10) - PILL;
  const fall = Math.max(24, barTop - leak.y);
  const fallMs = fall / FALL_SPEED;
  const total = fallMs + POUR_MS + TAIL_MS + FADE_MS;
  // Phase boundaries as shares of the whole run.
  const landAt = fallMs / total;
  const breakAt = (fallMs + POUR_MS) / total;
  const goneAt = (fallMs + POUR_MS + TAIL_MS) / total;

  const t = useSharedValue(0);
  const flow = useSharedValue(0);
  useEffect(() => {
    t.set(
      withTiming(1, { duration: total, easing: Easing.linear }, (done) => {
        // This callback runs on the UI thread: hand the store update back to JS (calling a plain JS
        // function here directly crashes the app — the "−" long-press crash, 2026-11-28).
        if (done) scheduleOnRN(clearLeak);
      }),
    );
    flow.set(withRepeat(withTiming(1, { duration: 380, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(flow);
  }, [t, flow, total]);

  // The stream as one tapered shape (SVG): wide where it leaves the card, thinner as it speeds up,
  // its front accelerating down; while drying up it thins and its top falls away.
  const streamProps = useAnimatedProps(() => {
    const p = t.get();
    const g = Math.min(1, p / landAt);
    const bottom = fall * g * g;
    const tail = p > breakAt ? Math.min(1, (p - breakAt) / (goneAt - breakAt)) : 0;
    const top = fall * tail * tail;
    const dry = 1 - tail * 0.7;
    const wob = Math.sin(p * 47) * 0.7;
    const topW = (6.5 + Math.sin(p * 31) * 0.6) * dry;
    const lowW = 2.4 * dry;
    if (p >= goneAt || bottom - top < 1) return { d: "M0 0" };
    const cx = SVG_PAD;
    // Left edge down, a soft round end, right edge up.
    return {
      d: `M${cx - topW / 2} ${top} C${cx - topW / 2} ${top + (bottom - top) * 0.35} ${cx - lowW / 2 + wob} ${bottom - 12} ${cx - lowW / 2 + wob} ${bottom} Q${cx + wob} ${bottom + 3} ${cx + lowW / 2 + wob} ${bottom} C${cx + lowW / 2 + wob} ${bottom - 12} ${cx + topW / 2} ${top + (bottom - top) * 0.35} ${cx + topW / 2} ${top} Z`,
    };
  });
  // The bulge where water gathers on the card's lip before it falls (gone once it dries up).
  const lip = useAnimatedStyle(() => {
    const p = t.get();
    const on = p < breakAt ? Math.min(1, p / 0.05) : Math.max(0, 1 - (p - breakAt) / 0.05);
    return { opacity: on, transform: [{ scale: 0.6 + on * 0.4 + Math.sin(p * 25) * 0.04 }] };
  });
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateY: -24 + flow.get() * 24 }] }));
  const pool = useAnimatedStyle(() => {
    const p = t.get();
    const spread = p < landAt ? 0 : Math.min(1, (p - landAt) / (breakAt - landAt + 0.1));
    const fade = p > goneAt ? Math.max(0, 1 - (p - goneAt) / (1 - goneAt)) : 1;
    return {
      opacity: spread > 0 ? 0.55 * fade : 0,
      transform: [{ scaleX: 0.15 + spread }, { scaleY: 0.3 + spread * 0.7 }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The stream: one tapered shape from the card's lip down to the bar. */}
      <Svg width={SVG_PAD * 2} height={fall + 8} style={{ position: "absolute", left: leak.x - SVG_PAD, top: leak.y }}>
        <AnimatedPath animatedProps={streamProps} fill={leak.color} opacity={0.9} />
      </Svg>
      {/* Light running down inside it, so it reads as flowing. */}
      <View style={[styles.sheenClip, { left: leak.x - 1.5, top: leak.y, height: fall }]}>
        <Animated.View style={[styles.sheenWrap, sheen]}>
          {Array.from({ length: Math.ceil(fall / 24) + 2 }, (_, i) => (
            <LinearGradient
              key={i}
              colors={SHEEN}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ width: "100%", height: 24 }}
            />
          ))}
        </Animated.View>
      </View>
      <Animated.View style={[styles.lip, { left: leak.x - 7, top: leak.y - 5, backgroundColor: leak.color }, lip]} />
      {/* Near the bottom the stream breaks into droplets that bead off into the pool. */}
      {[0, 1, 2].map((i) => (
        <Bead
          key={i}
          t={t}
          index={i}
          landAt={landAt}
          breakAt={breakAt}
          x={leak.x}
          y={leak.y + fall - 34}
          color={leak.color}
        />
      ))}
      {/* Pooling along the top edge of the tab bar. */}
      <Animated.View style={[styles.pool, { left: leak.x - 70, top: barTop - 7, backgroundColor: leak.color }, pool]} />
      {[0, 1, 2, 3].map((i) => (
        <Ripple
          key={i}
          t={t}
          from={landAt + i * ((breakAt - landAt) / 4)}
          total={total}
          x={leak.x}
          y={barTop - 6}
          color={leak.color}
        />
      ))}
    </View>
  );
}

/** A droplet breaking off the stream's end and falling the last bit into the pool, on a loop while it pours. */
function Bead({
  t,
  index,
  landAt,
  breakAt,
  x,
  y,
  color,
}: {
  t: SharedValue<number>;
  index: number;
  landAt: number;
  breakAt: number;
  x: number;
  y: number;
  color: string;
}) {
  const b = useSharedValue(0);
  useEffect(() => {
    b.set(
      withDelay(index * 170, withRepeat(withTiming(1, { duration: 510, easing: Easing.in(Easing.quad) }), -1, false)),
    );
    return () => cancelAnimation(b);
  }, [b, index]);
  const style = useAnimatedStyle(() => {
    const pouring = t.get() > landAt && t.get() < breakAt + 0.04;
    return {
      opacity: pouring ? 1 - b.get() * 0.3 : 0,
      transform: [{ translateY: b.get() * 30 }, { scaleY: 1 + b.get() * 0.4 }],
    };
  });
  return (
    <Animated.View style={[styles.bead, { left: x - 2 + (index - 1) * 0.8, top: y, backgroundColor: color }, style]} />
  );
}

/** A ring spreading out along the bar from where the stream lands. */
function Ripple({
  t,
  from,
  total,
  x,
  y,
  color,
}: {
  t: SharedValue<number>;
  from: number;
  total: number;
  x: number;
  y: number;
  color: string;
}) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.set(withDelay(from * total, withTiming(1, { duration: 760, easing: Easing.out(Easing.quad) })));
  }, [r, from, total]);
  const style = useAnimatedStyle(() => ({
    opacity: r.get() > 0 ? (1 - r.get()) * 0.85 : 0,
    transform: [{ scaleX: 0.4 + r.get() * 2.2 }, { scaleY: 0.4 + r.get() * 0.6 }],
  }));
  return <Animated.View style={[styles.ring, { left: x - 22, top: y, borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  sheenClip: { position: "absolute", width: 3, overflow: "hidden", borderRadius: 2, opacity: 0.8 },
  sheenWrap: { position: "absolute", left: 0, right: 0, top: 0 },
  lip: { position: "absolute", width: 14, height: 9, borderRadius: 7 },
  bead: { position: "absolute", width: 4, height: 5, borderRadius: 2.5 },
  pool: { position: "absolute", width: 140, height: 14, borderRadius: 70 },
  ring: { position: "absolute", width: 44, height: 12, borderRadius: 22, borderWidth: 1.5 },
});
