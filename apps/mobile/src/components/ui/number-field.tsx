import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { fade, fonts, makeStyles, radius, useColors, INPUT_CARET } from "@/lib/theme";
import { FieldError } from "./field-error";
import { Text } from "./text";
import { useOnSurface } from "./surface";

/** Label above, 52 px box, big value with a unit suffix. Keeps the raw string so users can type "7" then "72.5". */
export function NumberField({
  label,
  unit,
  value,
  onValueChange,
  hint,
  error,
  keyboardType = "decimal-pad",
  filled,
  ...props
}: {
  label: string;
  unit?: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** Inside a white card or sheet: grey fill, no outline until focused (v2). */
  filled?: boolean;
} & Omit<TextInputProps, "value" | "onChangeText">) {
  const c = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const onWhite = useOnSurface();
  filled = filled ?? onWhite;
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text variant="labelStrong" color={c.ink2}>
        {label}
      </Text>
      <View
        style={[
          styles.box,
          filled && { backgroundColor: c.ground },
          { borderColor: error ? c.caution : focused ? c.ink : filled ? "transparent" : c.lineStrong },
        ]}
      >
        <TextInput
          {...INPUT_CARET}
          accessibilityLabel={label}
          value={value}
          onChangeText={(v) => onValueChange(v.replace(",", "."))}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={fade(c.ink3, 0.6)}
          style={styles.input}
          {...props}
        />
        {unit && (
          <Text weight={500} color={c.ink3} style={{ marginLeft: 8 }}>
            {unit}
          </Text>
        )}
      </View>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <Text variant="labelRegular" color={c.ink2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.input,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.sans600,
    fontSize: 18,
    color: c.ink,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
}));
