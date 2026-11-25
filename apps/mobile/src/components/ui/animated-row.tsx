import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { appear, disappear, listLayout } from "@/lib/motion";

/**
 * One row of a list that grows and shrinks (reminders, meals, memories). A new row fades up, a
 * removed one fades out, and the rows around it slide into place instead of jumping. Key it by the
 * item's id. Reanimated skips all of it under Reduce Motion.
 */
export function AnimatedRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={appear} exiting={disappear} layout={listLayout} style={style}>
      {children}
    </Animated.View>
  );
}
