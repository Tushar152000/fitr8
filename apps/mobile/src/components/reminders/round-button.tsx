import type { LucideIcon } from "lucide-react-native";
import { PressableScale } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/** 44 px round icon button on the sunken tone (the reminder time stepper's − and +). */
export function RoundButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.round}
      hitSlop={4}
    >
      <Icon size={20} color={c.ink} />
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
}));
