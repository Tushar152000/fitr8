import { View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** One small figure in a row of them: grey label over a bold value (the week summary, 16d's day). */
export function Stat({ label, value, size }: { label: string; value: string; size?: number }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text size={12} weight={600} color={c.ink3}>
        {label}
      </Text>
      <Text weight={700} size={size} tabular>
        {value}
      </Text>
    </View>
  );
}
