import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./text";

/** A titled block of a screen: h2 heading over its content. */
export function Section({ title, gap = 10, children }: { title: string; gap?: number; children: ReactNode }) {
  return (
    <View style={{ gap }}>
      <Text variant="h2">{title}</Text>
      {children}
    </View>
  );
}
