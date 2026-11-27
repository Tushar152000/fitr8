import { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ShiningWordmark } from "@/components/brand/shining-wordmark";
import { haptic } from "@/lib/haptics";
import { palettes, useAppearance, type AppearancePreference } from "@/lib/theme";

/**
 * Dark ↔ light switch animation (user request 2026-11-28): a circle in the new theme's page colour
 * grows from the point that was tapped until it covers the screen, while the FITR8 wordmark (in
 * the new theme's ink) rises and scales in at the centre and a lime light sweeps across it, as on
 * the launch cover (user request: FITR8, not a sun/moon). Once covered, the theme flips underneath, then the circle fades
 * to show the restyled app. Call `revealScheme(pref, origin)`; mounted once in the root layout.
 * Reduce Motion: the theme just changes.
 */
type Reveal = { id: number; pref: AppearancePreference; to: "light" | "dark"; x: number; y: number } | null;

let state: Reveal = null;
const listeners = new Set<() => void>();
const set = (next: Reveal) => {
  state = next;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Switch to `pref` (resolving to `to`) with the reveal starting at window point `origin`. */
export function revealScheme(pref: AppearancePreference, to: "light" | "dark", origin: { x: number; y: number }) {
  if (state) return; // one at a time
  set({ id: Date.now(), pref, to, ...origin });
}

const GROW_MS = 560;
const FADE_MS = 320;

export function ThemeReveal() {
  // Third argument: the server snapshot (web pages are rendered on the server; there is never a reveal there).
  const reveal = useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
  if (!reveal) return null;
  return <RevealRun key={reveal.id} reveal={reveal} />;
}

function RevealRun({ reveal }: { reveal: NonNullable<Reveal> }) {
  const { setPreference } = useAppearance();
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [done] = useState(() => () => set(null));
  const grow = useSharedValue(0);
  const fade = useSharedValue(1);
  const spin = useSharedValue(0);

  const p = palettes[reveal.to];
  const R = Math.hypot(Math.max(reveal.x, width - reveal.x), Math.max(reveal.y, height - reveal.y));
  const onDark = reveal.to === "dark";
  const ink = onDark ? "#ffffff" : "#000000";

  useEffect(() => {
    if (reduce) {
      setPreference(reveal.pref);
      done();
      return;
    }
    haptic.select();
    const flip = () => {
      setPreference(reveal.pref);
      haptic.success();
    };
    spin.value = withDelay(120, withTiming(1, { duration: GROW_MS, easing: Easing.out(Easing.back(1.4)) }));
    grow.value = withTiming(1, { duration: GROW_MS, easing: Easing.inOut(Easing.cubic) }, (ok) => {
      if (!ok) return;
      scheduleOnRN(flip);
      // A frame or two for the restyle to paint under the cover, then fade it out.
      fade.value = withDelay(
        90,
        withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (fin) => {
          if (fin) scheduleOnRN(done);
        }),
      );
    });
  }, [reduce, reveal.pref, setPreference, done, grow, fade, spin]);

  const circle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: grow.value }] }));
  const icon = useAnimatedStyle(() => ({
    opacity: fade.value * Math.min(1, spin.value * 1.4),
    transform: [{ translateY: (1 - spin.value) * 18 }, { scale: 0.7 + spin.value * 0.3 + (1 - fade.value) * 0.12 }],
  }));

  if (reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View
        style={[
          styles.circle,
          {
            left: reveal.x - R,
            top: reveal.y - R,
            width: R * 2,
            height: R * 2,
            borderRadius: R,
            backgroundColor: p.ground,
          },
          circle,
        ]}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Animated.View style={icon}>
          <ShiningWordmark ink={ink} onDark={onDark} delayMs={260} durationMs={620} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: "absolute" },
  center: { alignItems: "center", justifyContent: "center" },
});
