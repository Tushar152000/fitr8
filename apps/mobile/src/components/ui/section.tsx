import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./text";

/** A titled block of a screen: heading2 10 px over its content (the one heading gap). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="heading2">{title}</Text>
      {children}
    </View>
  );
}
