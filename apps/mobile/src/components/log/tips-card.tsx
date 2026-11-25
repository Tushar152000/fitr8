import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** A card of photo tips, one green tick per line (a better plate photo, a good label photo). */
export function TipsCard({ title, tips, icon: Icon }: { title: string; tips: readonly string[]; icon: LucideIcon }) {
  const c = useColors();
  return (
    <Card>
      <Text weight={600}>{title}</Text>
      {tips.map((tip) => (
        <View key={tip} style={{ flexDirection: "row", gap: 8 }}>
          <Icon size={16} color={c.protein} style={{ marginTop: 3 }} />
          <Text color={c.ink2} style={{ flex: 1 }}>
            {tip}
          </Text>
        </View>
      ))}
    </Card>
  );
}
