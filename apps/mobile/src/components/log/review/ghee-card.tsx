import { View } from "react-native";
import { Card, Switch, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** "Cooked with ghee or oil": adds one teaspoon of fat to the meal. */
export function GheeCard({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const c = useColors();
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={{ flex: 1 }}>
        <Text weight={600}>Cooked with ghee or oil</Text>
        <Text size={13} color={c.ink3} tabular>
          +45 kcal · +5 g fat (1 tsp)
        </Text>
      </View>
      <Switch checked={checked} onChange={onChange} label="Cooked with ghee or oil" />
    </Card>
  );
}
