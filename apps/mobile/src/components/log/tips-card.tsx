import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** A card of photo tips, one green tick per line (a better plate photo, a good label photo). */
export function TipsCard({ title, tips, icon: Icon }: { title: string; tips: readonly string[]; icon: LucideIcon }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text variant="heading3">{title}</Text>
      {tips.map((tip) => (
        <View key={tip} style={{ flexDirection: "row", gap: 10 }}>
          <Icon size={16} color={c.protein} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text variant="bodySm" color={c.ink2} style={{ flex: 1 }}>
            {tip}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 12, borderRadius: radius.card, backgroundColor: c.surface, padding: 16, ...shadows.card },
}));
