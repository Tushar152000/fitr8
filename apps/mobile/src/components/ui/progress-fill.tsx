import { useEffect, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { VALUE_MS } from "@/lib/motion";

/**
 * A progress bar (track + fill) whose fill glides to a new value (docs/DESIGN.md: bars animate value
 * changes). The first value is drawn as-is, so a page that mounts doesn't replay the fill; only
 * changes animate. Reanimated jumps straight there under Reduce Motion.
 */
export function ProgressFill({
  fraction,
  color,
  trackStyle,
  fillStyle,
}: {
  /** 0..1; clamped. */
  fraction: number;
  color: string;
  trackStyle: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
}) {
  const f = Math.min(1, Math.max(0, fraction));
  const [width, setWidth] = useState(0);
  const value = useSharedValue(f);
  // Starts at the first value; later changes animate.
  useEffect(() => {
    value.set(withTiming(f, { duration: VALUE_MS }));
  }, [f, value]);
  const animated = useAnimatedStyle(() => ({ width: value.get() * width }));
  return (
    <View style={trackStyle} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ height: "100%", backgroundColor: color }, fillStyle, animated]} />
    </View>
  );
}
