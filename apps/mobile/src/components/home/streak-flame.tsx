import { Image } from "expo-image";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/lib/motion";
import { LiveFire } from "./live-fire";

const FLAME = require("../../../assets/streak/flame.svg");
const DROP = require("../../../assets/streak/flame-drop.svg");
const GLOW = require("../../../assets/streak/flame-glow.png");

const EASE = Easing.inOut(Easing.sin);

/**
 * Two out-of-step loops (0 → 1 → 0) that drive a "live fire": a slow sway and a quicker flicker.
 * Idle (both 0) unless `lit` and Reduce Motion is off.
 */
function useFire(lit: boolean) {
  const reduce = useReduceMotion();
  const sway = useSharedValue(0);
  const flicker = useSharedValue(0);
  const on = lit && !reduce;
  useEffect(() => {
    if (!on) {
      cancelAnimation(sway);
      cancelAnimation(flicker);
      sway.set(0);
      flicker.set(0);
      return;
    }
    sway.set(withRepeat(withTiming(1, { duration: 1300, easing: EASE }), -1, true));
    flicker.set(withRepeat(withTiming(1, { duration: 420, easing: EASE }), -1, true));
    return () => {
      cancelAnimation(sway);
      cancelAnimation(flicker);
    };
  }, [on, sway, flicker]);
  return { sway, flicker, on };
}

/** Ember colours: the flame's lime, a pale lime and a warm yellow. */
const EMBER_COLORS = ["#C2E04A", "#E4F59B", "#FFD34D"] as const;

/**
 * Small sparks rising off the flame and fading, each on its own staggered loop. `count` sparks,
 * spread across the flame's width; `size` is the flame's box so it scales with the icon.
 */
function Embers({ size, count }: { size: number; count: number }) {
  return (
    <View style={{ position: "absolute", left: 0, top: 0, width: size, height: size, pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => (
        <Ember key={i} size={size} index={i} count={count} />
      ))}
    </View>
  );
}

function Ember({ size, index, count }: { size: number; index: number; count: number }) {
  const t = useSharedValue(0);
  const period = 1100 + ((index * 370) % 600);
  useEffect(() => {
    t.set(
      withDelay(
        (index * period) / count,
        withRepeat(withTiming(1, { duration: period, easing: Easing.out(Easing.quad) }), -1, false),
      ),
    );
    return () => cancelAnimation(t);
  }, [t, index, count, period]);
  const dot = Math.max(2, size * 0.13);
  // Start near the flame's upper middle, drift a little sideways (alternating), rise ~0.9 × size.
  const startX = size * (0.3 + ((index * 0.37) % 0.4));
  const drift = (index % 2 ? 1 : -1) * size * 0.18;
  const style = useAnimatedStyle(() => ({
    opacity: t.get() < 0.15 ? t.get() / 0.15 : 1 - (t.get() - 0.15) / 0.85,
    transform: [{ translateX: drift * t.get() }, { translateY: -size * 0.9 * t.get() }, { scale: 1 - t.get() * 0.6 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: size * 0.25,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: EMBER_COLORS[index % EMBER_COLORS.length],
        },
        style,
      ]}
    />
  );
}

/**
 * The streak flame (Figma "Icon/flame"), burning (user request 2026-11-28). `lit` (any active
 * streak) swaps the icon for a `LiveFire` (three licking SVG tongues) with embers rising off it; `best` (a personal best:
 * current = longest) blazes: more embers and a pulsing lime glow behind. Otherwise, or under Reduce
 * Motion, it's the still icon.
 */
export function StreakFlame({
  size = 20,
  lit = false,
  best = false,
}: {
  size?: number;
  lit?: boolean;
  best?: boolean;
}) {
  const { sway, flicker, on } = useFire(lit || best);
  const flame = useAnimatedStyle(() => ({
    transformOrigin: "50% 92%",
    transform: [
      { rotate: `${(sway.get() - 0.5) * 9}deg` },
      { scaleY: 0.95 + flicker.get() * 0.1 },
      { scaleX: 1.03 - flicker.get() * 0.06 },
    ],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + flicker.get() * 0.35 + sway.get() * 0.2 }));
  const g = size * 1.9;
  return (
    <View style={{ width: size, height: size, overflow: "visible" }} accessible={false}>
      {on && best && (
        <Animated.View
          style={[
            {
              position: "absolute",
              pointerEvents: "none",
              width: g,
              height: g,
              left: (size - g) / 2,
              top: (size - g) / 2 + size * 0.1,
            },
            glow,
          ]}
        >
          <Image source={GLOW} style={{ width: g, height: g }} contentFit="contain" />
        </Animated.View>
      )}
      {on ? (
        // Burning: a real live fire (three licking tongues), a touch taller than the icon box.
        <View style={{ position: "absolute", left: 0, bottom: 0 }}>
          <LiveFire width={size} height={size * 1.1} level={best ? "blaze" : "burn"} />
        </View>
      ) : (
        <Animated.View style={on ? flame : undefined}>
          <Image source={FLAME} style={{ width: size, height: size }} contentFit="contain" />
        </Animated.View>
      )}
      {on && <Embers size={size} count={best ? 4 : 2} />}
    </View>
  );
}

/**
 * The 84 px flame drop of the streak sheet's badge with its glow; `children` (the number) stays
 * still on top. `lit` (any active streak) sways and flickers the drop, pulses the glow and sends
 * embers up above the badge; `best` sends more. No streak: a slow breathing ember (swell + glow).
 * Reduce Motion: still.
 */
export function StreakDrop({
  lit = false,
  best = false,
  children,
}: {
  lit?: boolean;
  best?: boolean;
  children: ReactNode;
}) {
  const { sway, flicker, on } = useFire(lit || best);
  const reduce = useReduceMotion();
  // No streak: a slow "breathing" ember instead of a still badge (user request 2026-11-28).
  const breath = useSharedValue(0);
  const idle = !on && !reduce;
  useEffect(() => {
    if (!idle) {
      cancelAnimation(breath);
      breath.set(0);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: 1800, easing: EASE }), -1, true));
    return () => cancelAnimation(breath);
  }, [idle, breath]);

  // Burning: clearly visible sway (±4°) and flicker (±4 % tall, a touch narrower as it stretches).
  const drop = useAnimatedStyle(() => ({
    transformOrigin: "50% 94%",
    transform: on
      ? [
          { rotate: `${(sway.get() - 0.5) * 8}deg` },
          { scaleY: 0.96 + flicker.get() * 0.08 },
          { scaleX: 1.02 - flicker.get() * 0.04 },
        ]
      : [{ scale: 1 + breath.get() * 0.035 }],
  }));
  const glow = useAnimatedStyle(() => ({
    opacity: on ? 0.6 + flicker.get() * 0.4 : 0.45 + breath.get() * 0.35,
    transform: [{ scale: on ? 1 + sway.get() * 0.12 : 0.96 + breath.get() * 0.08 }],
  }));
  return (
    // Not clipped, so embers rise above the badge.
    <View style={{ width: 84, height: 84 }}>
      <Animated.View style={[layer, glow]}>
        <Image source={GLOW} style={layer} contentFit="fill" />
      </Animated.View>
      {/* Live flames licking up from behind the badge (low "ember" with no streak). */}
      {!reduce && (
        <View style={{ position: "absolute", left: 10, top: on ? -34 : -18 }} pointerEvents="none">
          <LiveFire width={64} height={on ? 76 : 56} level={best ? "blaze" : on ? "burn" : "ember"} />
        </View>
      )}
      <Animated.View style={[layer, drop]}>
        <Image source={DROP} style={layer} contentFit="fill" />
      </Animated.View>
      {on && <Embers size={84} count={best ? 7 : 5} />}
      {children}
    </View>
  );
}

const layer = { position: "absolute", left: 0, top: 0, width: 84, height: 84 } as const;
