import { Check } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** The health checkbox (medical condition, pregnant or under 18): keeps calories at maintenance. */
export function MedicalCheck({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.check}
    >
      <View style={[styles.box, checked && { backgroundColor: c.brand, borderColor: c.brand }]}>
        {checked && <Check size={16} color={c.white} strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">I have a medical condition, am pregnant, or am under 18</Text>
        <Text variant="labelRegular" color={c.ink2} style={{ lineHeight: 18 }}>
          We&apos;ll keep calories at maintenance instead of a deficit. Check with your doctor.
        </Text>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  check: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: radius.card,
    backgroundColor: c.surface,
    padding: 16,
    ...shadows.card,
  },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
}));
