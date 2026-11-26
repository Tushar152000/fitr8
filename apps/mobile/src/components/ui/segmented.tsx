import { View } from "react-native";
import { haptic } from "@/lib/haptics";
import { makeStyles, useColors } from "@/lib/theme";
import { PressableScale } from "./pressable-scale";
import { Indicator, useSlidingIndicator } from "./sliding-indicator";
import { Text } from "./text";

/**
 * Sunken track; the selected option is a raised surface that slides to the option picked (user
 * decision 2026-11-27: no jump between options; `useSlidingIndicator`). `tone="dark"` is the Figma
 * pill version on the always-dark camera (solid dark track, white selected pill, 13 px labels).
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  tone = "light",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  tone?: "light" | "dark";
}) {
  const c = useColors();
  const styles = useStyles();
  const dark = tone === "dark";
  const slide = useSlidingIndicator(options.findIndex((o) => o.value === value));

  return (
    <View style={dark ? styles.darkTrack : styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Indicator slide={slide} style={dark ? styles.darkSelected : styles.selected} />
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onLayout={slide.onLayout(i)}
            onPress={() => {
              if (o.value !== value) haptic.select();
              onChange(o.value);
            }}
            style={dark ? styles.darkOption : styles.option}
          >
            {dark ? (
              <Text weight={600} size={13} color={selected ? DARK_INK : DARK_MUTED} numberOfLines={1}>
                {o.label}
              </Text>
            ) : (
              <Text weight={600} color={selected ? c.ink : c.ink2}>
                {o.label}
              </Text>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

// Fixed: the dark tone only sits on the camera, which is dark in both themes.
const DARK_INK = "#0e0e0e";
const DARK_MUTED = "rgba(255,255,255,0.6)";

const useStyles = makeStyles((c, shadows) => ({
  track: { flexDirection: "row", borderRadius: 14, backgroundColor: c.chip, padding: 4 },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  selected: { backgroundColor: c.raised, borderRadius: 11, ...shadows.seg },
  // Solid: white 8 % over the camera's #0c0c0c panel, as drawn before the preview went full
  // screen (a see-through track vanished over a bright camera feed).
  darkTrack: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 100, backgroundColor: "#1f1f1f" },
  darkOption: { flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: "center", justifyContent: "center" },
  darkSelected: { backgroundColor: "#ffffff", borderRadius: 100 },
}));
