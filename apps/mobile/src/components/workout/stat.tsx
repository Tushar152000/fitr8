import { View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** One small figure in a row of them (16d's day card): Label/Medium label over a Heading/H3 value. */
export function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="labelMedium" color={c.ink2} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading3" numberOfLines={1} tabular>
        {value}
      </Text>
    </View>
  );
}
