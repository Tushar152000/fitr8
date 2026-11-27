import { ArrowRight } from "lucide-react-native";
import { View } from "react-native";
import { MovingGradient, PressableScale, Text } from "@/components/ui";
import { makeStyles } from "@/lib/theme";

/**
 * Compact pill CTA for upsell cards (40 px tall, sized to its label; 44 px touch with hitSlop).
 * `tone="glass"` = the moving olive gradient for light cards; `tone="light"` = white pill for dark cards.
 * Without `onPress` it's a visual only (the whole card is the button).
 */
export function SmallCta({
  label,
  onPress,
  tone = "glass",
}: {
  label: string;
  onPress?: () => void;
  tone?: "glass" | "light";
}) {
  const styles = useStyles();
  const fg = tone === "light" ? "#0e0e0e" : "#ffffff";
  const body = (
    <>
      <Text weight={700} size={14} color={fg}>
        {label}
      </Text>
      <ArrowRight size={16} color={fg} strokeWidth={2.4} />
    </>
  );
  const pill =
    tone === "light" ? (
      <View style={[styles.pill, styles.light]}>{body}</View>
    ) : (
      <View style={[styles.pill, styles.clip]}>
        <MovingGradient />
        {body}
      </View>
    );
  if (!onPress) return pill;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} scaleTo={0.97}>
      {pill}
    </PressableScale>
  );
}

const useStyles = makeStyles(() => ({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  light: { backgroundColor: "#ffffff" },
  clip: { overflow: "hidden" },
}));
