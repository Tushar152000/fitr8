import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import { makeStyles, useColors } from "@/lib/theme";
import { MovingGradient } from "./moving-gradient";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Figma "Button": a full-radius pill, 24 × 16 padding, Body/Strong label. `primary` is
 * gradient/primary with white text; `secondary` is a white pill; `soft` the canvas-grey pill used
 * on white cards ("Add food", "Go to today"); `link` is olive text only; `onDark` is the white pill
 * on always-dark surfaces (camera, workout day card): white with ink text in both themes; `danger`
 * is the red pill for a destructive action (delete, log out) with white text.
 */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  trailingIcon: Trailing,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "soft" | "link" | "onDark" | "danger";
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const styles = useStyles();
  const off = disabled || loading;
  const color =
    variant === "primary"
      ? c.white
      : variant === "danger"
        ? c.onDanger
        : variant === "link"
          ? c.brandText
          : variant === "onDark"
            ? ON_DARK_INK
            : c.ink;
  const content = loading ? (
    <ActivityIndicator color={color} />
  ) : (
    <View style={styles.row}>
      {Icon && <Icon size={16} color={color} strokeWidth={2} />}
      <Text variant="bodyStrong" color={color} numberOfLines={1}>
        {label}
      </Text>
      {Trailing && <Trailing size={16} color={color} strokeWidth={2} />}
    </View>
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={[
        variant === "link" ? null : styles.pill,
        variant === "secondary" && { backgroundColor: c.surface },
        variant === "soft" && { backgroundColor: c.ground },
        variant === "onDark" && { backgroundColor: c.white },
        variant === "danger" && { backgroundColor: c.danger },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {variant === "primary" ? (
        <View style={styles.pad}>
          <MovingGradient />
          {content}
        </View>
      ) : (
        <View style={variant === "link" ? null : styles.pad}>{content}</View>
      )}
    </PressableScale>
  );
}

/** Ink on the fixed white `onDark` pill (palettes.light ink). */
const ON_DARK_INK = "#0e0e0e";

const useStyles = makeStyles(() => ({
  pill: { borderRadius: 100, overflow: "hidden" },
  pad: { paddingHorizontal: 24, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
}));
