import { Image } from "expo-image";
import { Check } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui";
import { cam } from "./cam";

export type SnapPhase = "checking" | "uploading" | "analysing";

/** The steps shown while a photo is read, and which phase finishes each one. */
const STEPS: { label: string; doneAfter: SnapPhase | null }[] = [
  { label: "Photo captured", doneAfter: "checking" },
  { label: "Finding the dishes", doneAfter: "uploading" },
  { label: "Estimating portions and macros", doneAfter: null },
];
const ORDER: SnapPhase[] = ["checking", "uploading", "analysing"];
const LIME = "#C2E04A";

/**
 * The snap moment (2026-11-28, user request): replaces the plain spinner while a photo is checked,
 * uploaded and read. A white flash, then the photo itself shrinks from full screen into a rounded
 * card with a lime scan line sweeping over it, and three steps tick along with the real phases.
 * Without a photo (shouldn't happen) it shows just the steps. Reduce Motion: no flash or sweep.
 */
export function SnapMoment({ uri, phase }: { uri: string | null; phase: SnapPhase }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const shrink = useSharedValue(reduce ? 1 : 0);
  const flash = useSharedValue(reduce ? 0 : 1);
  const scan = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    flash.set(withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }));
    shrink.set(withTiming(1, { duration: 620, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    scan.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(scan);
  }, [reduce, flash, shrink, scan]);

  const cardW = Math.min(width - 64, 320);
  const cardH = cardW * 1.15;
  // From covering the screen to the card size, centred a little above the middle.
  const photoStyle = useAnimatedStyle(() => {
    const p = shrink.get();
    return {
      width: width + (cardW - width) * p,
      height: height + (cardH - height) * p,
      borderRadius: 28 * p,
      transform: [{ translateY: -40 * p }],
    };
  });
  const lineStyle = useAnimatedStyle(() => ({
    opacity: shrink.get() > 0.9 ? 1 : 0,
    transform: [{ translateY: scan.get() * (cardH - 4) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const at = ORDER.indexOf(phase);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} accessibilityLiveRegion="polite">
      {uri && (
        <Animated.View style={[styles.photo, photoStyle]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Animated.View style={[styles.line, lineStyle]} />
        </Animated.View>
      )}

      <Animated.View
        entering={reduce ? undefined : FadeIn.delay(350).duration(300)}
        style={[styles.steps, { width: cardW }]}
      >
        {STEPS.map((s, i) => {
          const done = s.doneAfter != null && ORDER.indexOf(s.doneAfter) < at;
          const active = !done && (i === 0 ? at === 0 : i === Math.min(at, STEPS.length - 1));
          return (
            <View key={s.label} style={styles.step}>
              <View style={[styles.dot, done && { backgroundColor: LIME, borderColor: LIME }]}>
                {done ? (
                  <Check size={11} color={cam.ink} strokeWidth={3} />
                ) : active ? (
                  <ActivityIndicator size="small" color={LIME} style={{ transform: [{ scale: 0.6 }] }} />
                ) : null}
              </View>
              <Text
                variant={active ? "labelStrong" : "labelMedium"}
                color={done || active ? cam.white : "rgba(255,255,255,0.45)"}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "#ffffff" }, flashStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "rgba(12,12,12,0.92)", alignItems: "center", justifyContent: "center" },
  photo: { overflow: "hidden", backgroundColor: "#000" },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: LIME,
    shadowColor: LIME,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  steps: { gap: 12, marginTop: 8, transform: [{ translateY: -24 }] },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
