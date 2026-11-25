import { Lightbulb } from "lucide-react-native";
import { View } from "react-native";
import { Section, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** "Coach tips" on a training day (16d): one lightbulb card per tip. */
export function CoachTips({ tips }: { tips: string[] }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Section title="Coach tips" gap={8}>
      {tips.map((t) => (
        <View key={t} style={styles.tip}>
          <Lightbulb size={16} color={c.carbsText} style={{ marginTop: 2 }} />
          <Text size={14} color={c.ink2} style={{ flex: 1 }}>
            {t}
          </Text>
        </View>
      ))}
    </Section>
  );
}

const useStyles = makeStyles((c) => ({
  tip: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.input, backgroundColor: c.surface },
}));
