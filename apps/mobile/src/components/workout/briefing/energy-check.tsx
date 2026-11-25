import { View } from "react-native";
import { Segmented, Text } from "@/components/ui";
import type { Energy } from "@/lib/types";

const OPTIONS: { value: Energy; label: string }[] = [
  { value: "great", label: "Great" },
  { value: "ok", label: "OK" },
  { value: "tired", label: "Tired" },
];

/** Briefing (10a) energy check: great, OK or tired reshapes today's session. */
export function EnergyCheck({ value, onChange }: { value: Energy; onChange: (energy: Energy) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">How&apos;s your energy?</Text>
      <Segmented label="Energy" value={value} onChange={onChange} options={OPTIONS} />
    </View>
  );
}
