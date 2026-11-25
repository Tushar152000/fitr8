import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { OLIVE_BUTTON } from "@/lib/gradients";

/**
 * Round button filled with the olive gradient (gradient/primary) on a dark lift, not the old purple
 * FAB glow: the coach's send and stop buttons (56 px) and the tab bar's camera (64 px, `edge` adds
 * the lime rim of black glass). Sinks to 96 % while pressed.
 */
export function GradientFab({
  size = 56,
  edge = false,
  disabled,
  children,
  ...rest
}: Omit<PressableProps, "style" | "children"> & { size?: number; edge?: boolean; children: ReactNode }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [styles.lift, round, pressed && !disabled && { transform: [{ scale: 0.96 }] }]}
    >
      <LinearGradient {...OLIVE_BUTTON} style={[styles.fill, round, edge && styles.edge]}>
        {children}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lift: { boxShadow: "0 8px 18px rgba(20, 24, 0, 0.32)" },
  fill: { alignItems: "center", justifyContent: "center" },
  edge: { borderWidth: 1, borderColor: "rgba(194,224,74,0.5)" }, // accent/highlight edge on the dark glass
});
