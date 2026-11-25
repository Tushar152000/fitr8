import { View } from "react-native";
import { makeStyles, useColors } from "@/lib/theme";
import { Text } from "./text";
import { PressableScale } from "./pressable-scale";

/**
 * Sunken track; the selected option is a raised surface. `tone="dark"` is the Figma pill version on
 * the always-dark camera (glass track, white selected pill, 13 px labels).
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
  return (
    <View style={dark ? styles.darkTrack : styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(o.value)}
            style={
              dark ? [styles.darkOption, selected && styles.darkSelected] : [styles.option, selected && styles.selected]
            }
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
  selected: { backgroundColor: c.raised, ...shadows.seg },
  darkTrack: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)" },
  darkOption: { flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: "center", justifyContent: "center" },
  darkSelected: { backgroundColor: "#ffffff" },
}));
