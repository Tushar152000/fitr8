import { Sparkles } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MovingGradient } from "@/components/ui";

const LIME = "#C2E04A";

/**
 * The coach's live avatar for the intro banner (2026-11-28): the black → olive gradient (glint), a
 * lime sparkle that twinkles (a soft swell and tilt) and a lime ring pulsing out, so the coach reads
 * as "online". Reduce Motion: still.
 */
export function CoachAvatar({ size = 52 }: { size?: number }) {
  const reduce = useReducedMotion();
  const twinkle = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    twinkle.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1400 }),
        ),
        -1,
        false,
      ),
    );
    ring.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
    return () => {
      cancelAnimation(twinkle);
      cancelAnimation(ring);
    };
  }, [reduce, twinkle, ring]);

  const spark = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + twinkle.get() * 0.18 }, { rotate: `${twinkle.get() * 14}deg` }],
  }));
  const pulse = useAnimatedStyle(() => ({
    opacity: (1 - ring.get()) * 0.55,
    transform: [{ scale: 1 + ring.get() * 0.45 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {!reduce && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: LIME,
            },
            pulse,
          ]}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MovingGradient width={size} height={size} />
        <Animated.View style={spark}>
          <Sparkles size={Math.round(size * 0.44)} color={LIME} strokeWidth={2.2} />
        </Animated.View>
      </View>
    </View>
  );
}
