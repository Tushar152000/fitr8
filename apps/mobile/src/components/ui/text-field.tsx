import { useState, type Ref } from "react";
import { TextInput, type TextInputInstance, type TextInputProps } from "react-native";
import { fonts, INPUT_CARET, makeStyles, radius, useColors } from "@/lib/theme";
import { useOnSurface } from "./surface";

/**
 * The app's 52 px text input (surface, strong hairline, input radius). Focused, the border turns ink
 * (as NumberField does; no browser focus ring, user decision 2026-11-27); `invalid` turns it amber.
 * The cursor and selection use the brand olive.
 */
export function TextField({
  style,
  invalid,
  placeholderTextColor,
  ref,
  onFocus,
  onBlur,
  filled,
  ...rest
}: TextInputProps & {
  invalid?: boolean;
  ref?: Ref<TextInputInstance>;
  /** Inside a white card or sheet: grey fill, no outline until focused (v2). */
  filled?: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const onWhite = useOnSurface();
  filled = filled ?? onWhite;
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? c.ink3}
      {...INPUT_CARET}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        filled && { backgroundColor: c.ground, borderColor: "transparent" },
        focused && { borderColor: c.ink },
        invalid && { borderColor: c.caution },
        style,
      ]}
      {...rest}
    />
  );
}

const useStyles = makeStyles((c) => ({
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radius.input,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    fontFamily: fonts.sans400,
    fontSize: 16,
    color: c.ink,
  },
}));
