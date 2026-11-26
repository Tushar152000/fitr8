import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { makeStyles, useColors } from "@/lib/theme";

const MS = 200;

/**
 * Figma "Toggle": 44×26 track (accent/primary when on, bg/track when off), 22 px white knob 2 px
 * in, with a soft drop shadow (0 1 3, 15 % black). Toggling slides the knob and blends the track
 * colour over 200 ms (user decision 2026-11-27: no jump); instant under Reduce Motion.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const on = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(checked ? 1 : 0, { duration: reduce ? 0 : MS, easing: Easing.out(Easing.cubic) }));
  }, [checked, reduce, on]);
  const off = c.track;
  const onColor = c.brand;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.get(), [0, 1], [off, onColor]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: on.get() * 18 }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onChange(!checked);
      }}
      hitSlop={8}
      style={disabled && { opacity: 0.5 }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  track: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: "center" },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.white,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.15)",
  },
}));
