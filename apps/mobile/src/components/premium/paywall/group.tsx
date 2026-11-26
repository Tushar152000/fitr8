import type { ReactNode } from "react";
import { View } from "react-native";
import { SectionLabel } from "@/components/ui";

/** A titled paywall block: the upper-case section label 10 px above its content (as MenuGroup's label). */
export function PaywallGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}
