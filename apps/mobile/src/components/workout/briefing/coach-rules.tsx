import { Sparkles } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { Glow } from "@/components/ui/glow";
import { fade, makeStyles, radius, useColors } from "@/lib/theme";
import type { TodayWorkout } from "@/lib/types";

/**
 * Briefing (10a): the rules the coach set for today's session, each with its reason, on the
 * Figma dark card (the Workout day card's inverse surface, lime glow, glass icon).
 */
export function CoachRules({ rules }: { rules: NonNullable<TodayWorkout["session"]>["rules"] }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Glow tone="lime" opacity={0.7} left={6} bottom={-59} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text variant="labelMedium" color={c.white} style={{ flex: 1 }} accessibilityRole="header">
          What your coach set today
        </Text>
        <View style={styles.icon}>
          <Sparkles size={18} color={c.highlight} strokeWidth={2} />
        </View>
      </View>
      {rules.map((r) => (
        <View key={r.title} style={{ gap: 4 }}>
          <Text variant="heading3" color={c.white}>
            {r.title}
          </Text>
          <Text variant="bodySm" color={fade(c.white, 0.75)}>
            {r.reason}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  // Inverse surface (always dark), hero padding, card radius and lift, clipping the glow.
  card: {
    gap: 16,
    padding: 20,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: c.panel,
    ...shadows.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.glassStrong,
    alignItems: "center",
    justifyContent: "center",
  },
}));
