import type { ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { haptic } from "@/lib/haptics";
import { useColors } from "@/lib/theme";
import { Text } from "./text";
import { PressableScale } from "./pressable-scale";
import { Indicator, useSlidingIndicator } from "./sliding-indicator";

/**
 * 36 px pill (grows and wraps for a long label, never wider than its row) with a 44 px hit area.
 * Dark tone for the camera screen. `slid`: the group draws the fills (ChipGroup: grey fills and a
 * sliding selected fill), so the chip itself is transparent and only sets its label colour.
 */
export function Chip({
  selected,
  tone = "light",
  onPress,
  children,
  icon,
  slid,
  onLayout,
}: {
  selected?: boolean;
  tone?: "light" | "dark";
  onPress?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  slid?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const c = useColors();
  const idle = tone === "dark" ? "rgba(255,255,255,0.12)" : c.chip;
  const bg = slid ? "transparent" : tone === "dark" ? (selected ? c.white : idle) : selected ? c.strong : idle;
  // Dark tone sits on the always-dark camera, so its selected text is a fixed near-black on white.
  const fg = tone === "dark" ? (selected ? "#151724" : "rgba(255,255,255,0.85)") : selected ? c.onStrong : c.ink2;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onLayout={onLayout}
      hitSlop={4}
      style={[styles.chip, { backgroundColor: bg, paddingHorizontal: tone === "dark" ? 14 : 16 }]}
    >
      {icon}
      <Text weight={600} size={14} color={fg} style={styles.label}>
        {children}
      </Text>
    </PressableScale>
  );
}

/**
 * Single-select wrapping row of chips. The selected fill slides to the chip picked, across rows too
 * (user decision 2026-11-27; useSlidingIndicator). Unselected chips keep their grey fill.
 */
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  const slide = useSlidingIndicator(options.findIndex((o) => o.value === value));
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {/* Grey chip fills underneath, then the sliding black fill over them, then transparent chips. */}
      {Object.entries(slide.boxes).map(([i, b]) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            width: b.width,
            height: b.height,
            borderRadius: 18,
            backgroundColor: c.chip,
            pointerEvents: "none",
          }}
        />
      ))}
      <Indicator slide={slide} style={{ borderRadius: 18, backgroundColor: c.strong }} />
      {options.map((o, i) => (
        <Chip
          key={String(o.value)}
          selected={o.value === value}
          slid
          onLayout={slide.onLayout(i)}
          onPress={() => {
            if (o.value !== value) haptic.select();
            onChange(o.value);
          }}
        >
          {o.label}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    maxWidth: "100%",
    paddingVertical: 8,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: { flexShrink: 1 },
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
