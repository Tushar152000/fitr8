import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { MovingGradient } from "./moving-gradient";

/**
 * Round button filled with the diagonally moving black → olive gradient (`MovingGradient`; no shadow): the coach's send and stop buttons and the tab bar's camera (60 px). Sinks to 96 % while
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
      <View style={[styles.fill, round]}>
        <MovingGradient width={size} height={size} />
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
