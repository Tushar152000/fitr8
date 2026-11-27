import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import { makeStyles, radius, useColors, type Colors } from "@/lib/theme";
import { MovingGradient } from "./moving-gradient";
import { Text } from "./text";
import { PressableScale } from "./pressable-scale";

export type ButtonVariant = "primary" | "strong" | "secondary" | "dashed" | "ghostDark" | "danger";

const bg = (c: Colors): Record<ButtonVariant, [string, string]> => ({
  primary: [c.brand, c.brandHover],
  strong: [c.strong, c.strongHover],
  secondary: [c.surface, c.sunken],
  dashed: ["transparent", c.sunken],
  ghostDark: ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.16)"],
  /** Destructive and final (delete account): never the screen's primary action. */
  danger: [c.danger, c.dangerHover],
});

const fg = (c: Colors): Record<ButtonVariant, string> => ({
  primary: c.white,
  strong: c.onStrong,
  secondary: c.ink,
  dashed: c.brandText,
  ghostDark: c.white,
  danger: c.onDanger,
});

/**
 * Full-width button in the v2 language (Figma "Button", user decision 2026-11-27: one look across
 * every screen): `primary` is the gradient pill (gradient/primary, white label), `secondary` a white
 * pill with a hairline, `strong` / `danger` / `ghostDark` solid pills; all 54 px tall. `dashed` (an
 * "add" row inside a list) stays a 44 px rounded rectangle. One primary per screen. The primary
 * gradient moves diagonally (`MovingGradient`, user request 2026-11-28: every gradient button).
 */
export function Button({
  children,
  onPress,
  variant = "primary",
  icon: Icon,
  disabled,
  loading,
  style,
  height,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const styles = useStyles();
  const color = fg(c)[variant];
  const fills = bg(c)[variant];
  const off = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant !== "dashed" && styles.pill,
        {
          height: height ?? (variant === "dashed" ? 44 : 54),
          backgroundColor: variant === "primary" ? "transparent" : fills[pressed ? 1 : 0],
        },
        variant === "primary" && pressed && { opacity: 0.9 },
        variant === "secondary" && styles.secondary,
        variant === "dashed" && styles.dashed,
        variant === "ghostDark" && styles.ghostDark,
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {variant === "primary" && <MovingGradient />}
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={20} color={color} strokeWidth={2} />}
          {isText(children) ? (
            <Text variant="button" color={color}>
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </PressableScale>
  );
}

/** Plain text children ("Add ", "dinner") get the button text style. */
function isText(node: ReactNode): boolean {
  if (typeof node === "string" || typeof node === "number") return true;
  return Array.isArray(node) && node.every((n) => typeof n === "string" || typeof n === "number");
}

const useStyles = makeStyles((c) => ({
  base: {
    width: "100%",
    borderRadius: radius.button,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pill: { borderRadius: 100 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  secondary: { borderWidth: 1, borderColor: c.lineStrong },
  dashed: { borderWidth: 1.5, borderStyle: "dashed", borderColor: c.dash },
  ghostDark: { borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
}));
