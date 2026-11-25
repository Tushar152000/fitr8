import { useEffect } from "react";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Circle } from "react-native-svg";
import { VALUE_MS } from "@/lib/motion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * One progress arc of a ring (draw it inside an Svg rotated -90°). Glides to a new fraction when the
 * value changes (docs/DESIGN.md: rings animate value changes); jumps under Reduce Motion.
 */
export function RingArc({
  centre,
  r,
  strokeWidth,
  fraction,
  color,
}: {
  centre: number;
  r: number;
  strokeWidth: number;
  /** 0..1; clamped. */
  fraction: number;
  color: string;
}) {
  const circ = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  const value = useSharedValue(f);
  useEffect(() => {
    value.set(withTiming(f, { duration: VALUE_MS }));
  }, [f, value]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - value.get()) }));
  return (
    <AnimatedCircle
      cx={centre}
      cy={centre}
      r={r}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${circ} ${circ}`}
      stroke={color}
      // A round cap still draws a dot at 0, so an empty arc is hidden instead.
      strokeOpacity={f > 0 ? 1 : 0}
      animatedProps={props}
    />
  );
}
