import type { LucideIcon } from "lucide-react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/** A session fact in focus mode (15b): time, exercise count, or the energy level (tappable). */
export function Pill({ icon: Icon, text, onPress }: { icon: LucideIcon; text: string; onPress?: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale disabled={!onPress} onPress={onPress} style={styles.pill}>
      <Icon size={16} color={c.ink2} />
      <Text weight={600} size={14} color={c.ink2}>
        {text}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  pill: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 18,
    backgroundColor: c.chip,
    paddingHorizontal: 16,
  },
}));
