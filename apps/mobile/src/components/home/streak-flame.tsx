import { Image } from "expo-image";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/lib/motion";

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

/**
 * The streak flame (Figma "Icon/flame"). `lit` (a personal best: current streak = longest, > 0)
 * makes it a moving fire: it sways and flickers from its base with a pulsing lime glow behind.
 * Otherwise, or under Reduce Motion, it's the still icon.
 */
export function StreakFlame({ size = 20, lit = false }: { size?: number; lit?: boolean }) {
  const { sway, flicker, on } = useFire(lit);
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
    <View style={{ width: size, height: size }} accessible={false}>
      {on && (
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
      <Animated.View style={on ? flame : undefined}>
        <Image source={FLAME} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

/**
 * The 84 px flame drop of the streak sheet's badge with its glow; `children` (the number) stays
 * still on top. `lit` sways the drop gently and pulses the glow (see StreakFlame).
 */
export function StreakDrop({ lit = false, children }: { lit?: boolean; children: ReactNode }) {
  const { sway, flicker, on } = useFire(lit);
  const drop = useAnimatedStyle(() => ({
    transformOrigin: "50% 94%",
    transform: [{ rotate: `${(sway.get() - 0.5) * 4}deg` }, { scaleY: 0.985 + flicker.get() * 0.03 }],
  }));
  const glow = useAnimatedStyle(() => ({
    opacity: 0.75 + flicker.get() * 0.25,
    transform: [{ scale: 1 + sway.get() * 0.06 }],
  }));
  return (
    <View style={{ width: 84, height: 84, overflow: "hidden" }}>
      <Animated.View style={[layer, on ? glow : undefined]}>
        <Image source={GLOW} style={layer} contentFit="fill" />
      </Animated.View>
      <Animated.View style={[layer, on ? drop : undefined]}>
        <Image source={DROP} style={layer} contentFit="fill" />
      </Animated.View>
      {children}
    </View>
  );
}

const layer = { position: "absolute", left: 0, top: 0, width: 84, height: 84 } as const;
