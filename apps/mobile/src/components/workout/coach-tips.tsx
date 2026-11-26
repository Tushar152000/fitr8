import { Lightbulb } from "lucide-react-native";
import { View } from "react-native";
import { IconTile, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** "Coach tips" on a training day (16d): one white card, a row per tip with the lightbulb tile. */
export function CoachTips({ tips }: { tips: string[] }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 10 }}>
      <Text variant="heading2" accessibilityRole="header">
        Coach tips
      </Text>
      <View style={styles.card}>
        {tips.map((t, i) => (
          <View key={t} style={[styles.tip, i > 0 && styles.divider]}>
            <IconTile icon={Lightbulb} accent />
            <Text variant="bodySm" color={c.ink2} style={{ flex: 1 }}>
              {t}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  tip: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
}));
