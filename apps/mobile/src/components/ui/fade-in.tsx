import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { contentIn } from "@/lib/motion";

/**
 * Wraps content that replaces a skeleton (or appears after a fetch) so it cross-fades in instead of
 * hard-cutting. Reanimated skips the fade under Reduce Motion.
 */
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={contentIn} style={style}>
      {children}
    </Animated.View>
  );
}
