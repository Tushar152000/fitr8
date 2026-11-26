import { View } from "react-native";
import { Segmented, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";
import type { Energy } from "@/lib/types";

const OPTIONS: { value: Energy; label: string }[] = [
  { value: "great", label: "Great" },
  { value: "ok", label: "OK" },
  { value: "tired", label: "Tired" },
];

/** Briefing (10a) energy check: great, OK or tired reshapes today's session. */
export function EnergyCheck({ value, onChange }: { value: Energy; onChange: (energy: Energy) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      <Text variant="labelStrong" color={c.ink2} accessibilityRole="header">
        How&apos;s your energy?
      </Text>
      <Segmented label="Energy" value={value} onChange={onChange} options={OPTIONS} />
    </View>
  );
}
