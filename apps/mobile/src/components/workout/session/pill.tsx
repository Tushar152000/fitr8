import type { LucideIcon } from "lucide-react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/**
 * A session fact in focus mode (15b): time, exercise count, or the energy level (tappable). The
 * v2 light tag: white pill with the card lift, 14 px glyph, Label/Strong.
 */
export function Pill({ icon: Icon, text, onPress }: { icon: LucideIcon; text: string; onPress?: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={styles.pill}
    >
      <Icon size={14} color={c.ink2} strokeWidth={2} />
      <Text variant="labelStrong" tabular>
        {text}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  pill: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 100,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    ...shadows.card,
  },
}));
