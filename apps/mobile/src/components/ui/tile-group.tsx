import type { ReactNode } from "react";
import { View } from "react-native";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { Text } from "./text";
import { PressableScale } from "./pressable-scale";
import { Indicator, useSlidingIndicator } from "./sliding-indicator";
import { haptic } from "@/lib/haptics";

export interface TileOption<T extends string | number> {
  value: T;
  label: string;
  sub?: string;
  icon?: (color: string) => ReactNode;
}

/**
 * Row of equal radio tiles ("By when?", "Where I train"). Selected = a 2 px brand outline that
 * slides to the tile picked (user decision 2026-11-27; useSlidingIndicator).
 */
export function TileGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: TileOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const slide = useSlidingIndicator(options.findIndex((o) => o.value === value));
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onLayout={slide.onLayout(i)}
            onPress={() => {
              if (!selected) haptic.select();
              onChange(o.value);
            }}
            style={[styles.tile, styles.idle]}
          >
            {o.icon?.(selected ? c.brandText : c.ink2)}
            <Text weight={600} center>
              {o.label}
            </Text>
            {o.sub && (
              <Text weight={500} size={12} color={c.ink3} tabular center>
                {o.sub}
              </Text>
            )}
          </PressableScale>
        );
      })}
      {/* Over the tiles (it's only an outline): glides to the picked tile. */}
      <Indicator slide={slide} style={styles.outline} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", gap: 8 },
  tile: {
    flex: 1,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radius.input,
    backgroundColor: c.surface,
  },
  idle: { borderWidth: 1, borderColor: c.lineStrong, paddingHorizontal: 8, paddingVertical: 12 },
  outline: { borderWidth: 2, borderColor: c.brandText, borderRadius: radius.input },
}));
