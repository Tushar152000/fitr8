import { TextInput } from "react-native";
import { fonts, makeStyles, radius, useColors } from "@/lib/theme";

/** A kg or reps box in a set row (15b); a comma becomes a decimal point. */
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
    backgroundColor: c.sunken,
    paddingHorizontal: 12,
    fontFamily: fonts.sans600,
    fontSize: 15,
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
}));
