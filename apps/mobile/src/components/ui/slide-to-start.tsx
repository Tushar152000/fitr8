import { ChevronsRight, Play } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { haptic } from "@/lib/haptics";
import { makeStyles, useColors } from "@/lib/theme";
import { MovingGradient } from "./moving-gradient";
import { Text } from "./text";

const THUMB = 52;
const PAD = 4;
/** Past this share of the track, letting go starts it. */
const COMMIT = 0.85;

/**
 * "Slide to start" like answering a call on iPhone (user request 2026-11-28, for Start walk / run /
 * ride / flow): drag the round play thumb to the right; past 85 % it snaps to the end with a
 * success tap and calls `onComplete`, else it springs back. The label fades as the thumb moves and
 * a soft shimmer runs across it. Screen readers get a plain "activate" action. Reduce Motion: no
 * shimmer.
 */
export function SlideToStart({ label, onComplete }: { label: string; onComplete: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const max = Math.max(0, width - THUMB - PAD * 2);
  const x = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    shimmer.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(shimmer);
  }, [reduce, shimmer]);

  const done = () => {
    haptic.success();
    onComplete();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onChange((e) => {
      x.set(Math.min(max, Math.max(0, x.get() + e.changeX)));
    })
    .onEnd(() => {
      if (max > 0 && x.get() >= max * COMMIT) {
        x.set(
          withTiming(max, { duration: 120 }, (fin) => {
            if (fin) scheduleOnRN(done);
          }),
        );
      } else {
        x.set(withSpring(0, { damping: 16, stiffness: 180 }));
      }
    });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: max > 0 ? interpolate(x.get(), [0, max * 0.6], [1, 0], "clamp") : 1,
  }));
  const fill = useAnimatedStyle(() => ({ width: x.get() + THUMB + PAD }));
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: -60 + shimmer.get() * (width + 120) }] }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Slide right, or activate, to start"
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "activate") done();
      }}
    >
      {/* The part already slid over fills with the olive tint. */}
      <Animated.View style={[styles.fill, fill]} pointerEvents="none" />
      <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
        <Text variant="bodyStrong" color={c.ink2}>
          {label}
        </Text>
        <ChevronsRight size={18} color={c.ink3} strokeWidth={2.2} />
        {!reduce && width > 0 && <Animated.View style={[styles.shine, shine]} />}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, thumb]}>
          <MovingGradient width={THUMB} height={THUMB} />
          <Play size={20} color="#ffffff" fill="#ffffff" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  track: {
    height: THUMB + PAD * 2,
    borderRadius: (THUMB + PAD * 2) / 2,
    padding: PAD,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    justifyContent: "center",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (THUMB + PAD * 2) / 2,
    backgroundColor: c.brandSoft,
  },
  labelWrap: {
    position: "absolute",
    left: THUMB + PAD * 2,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
  },
  shine: { position: "absolute", top: 0, bottom: 0, width: 50, backgroundColor: c.surface, opacity: 0.55 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
}));
