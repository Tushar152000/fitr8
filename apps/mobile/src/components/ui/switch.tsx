import { Pressable, View } from "react-native";
import { makeStyles, useColors } from "@/lib/theme";
import { haptic } from "@/lib/haptics";

/**
 * Figma "Toggle": 44×26 track (accent/primary when on, bg/track when off), 22 px white knob 2 px
 * in, with a soft drop shadow (0 1 3, 15 % black).
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onChange(!checked);
      }}
      hitSlop={8}
      style={[styles.track, { backgroundColor: checked ? c.brand : c.track }, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.knob, { transform: [{ translateX: checked ? 18 : 0 }] }]} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  track: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: "center" },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.white,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.15)",
  },
}));
