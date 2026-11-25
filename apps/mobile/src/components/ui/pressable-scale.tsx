import { useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { PRESS_MS, PRESS_SCALE, useReduceMotion } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** A style, or a function of the pressed state (like Pressable's). */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** How far it sinks; the default is the app-wide 98 % (docs/DESIGN.md "Motion"). */
  scaleTo?: number;
};

/**
 * Pressable that sinks slightly while held, the one press feel across the app. Under Reduce Motion
 * it keeps whatever colour feedback its style gives and skips the scale.
 */
export function PressableScale({ style, scaleTo = PRESS_SCALE, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const to = (value: number) => {
    if (reduce) return;
    scale.set(withTiming(value, { duration: PRESS_MS }));
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        to(1);
        onPressOut?.(e);
      }}
      style={[typeof style === "function" ? style({ pressed }) : style, animated]}
    />
  );
}
