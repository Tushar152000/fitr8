import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { PRIMARY_PILL } from "@/lib/gradients";

/**
 * Round button filled with gradient/primary (Figma: black easing into olive towards the bottom, no
 * shadow): the coach's send and stop buttons and the tab bar's camera (60 px). Sinks to 96 % while
 * pressed.
 */
export function GradientFab({
  size = 60,
  disabled,
  children,
  ...rest
}: Omit<PressableProps, "style" | "children"> & { size?: number; children: ReactNode }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [round, pressed && !disabled && { transform: [{ scale: 0.96 }] }]}
    >
      <LinearGradient {...PRIMARY_PILL} style={[styles.fill, round]}>
        {children}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { alignItems: "center", justifyContent: "center" },
});
