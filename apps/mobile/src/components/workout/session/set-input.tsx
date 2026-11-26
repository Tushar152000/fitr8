import { TextInput } from "react-native";
import { fonts, makeStyles, radius, useColors, INPUT_CARET } from "@/lib/theme";

/**
 * A kg or reps box in a set row (15b); a comma becomes a decimal point. Inside the white exercise
 * card, so the v2 grey fill without an outline (like the add-item sheet's fields).
 */
export function SetInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <TextInput
      {...INPUT_CARET}
      accessibilityLabel={label}
      keyboardType="decimal-pad"
      value={value}
      placeholder={placeholder}
      placeholderTextColor={c.ink3}
      onChangeText={(v) => onChange(v.replace(",", "."))}
      style={styles.input}
    />
  );
}

const useStyles = makeStyles((c) => ({
  input: {
    height: 44,
    borderRadius: radius.input,
    backgroundColor: c.ground,
    paddingHorizontal: 14,
    fontFamily: fonts.sans600,
    fontSize: 14,
    color: c.ink,
    fontVariant: ["tabular-nums"],
    // No focus ring on the web either.
    outlineWidth: 0,
  },
}));
