import type { Ref } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { fonts, makeStyles, radius, useColors } from "@/lib/theme";

/** The app's 52 px text input (surface, strong hairline, input radius). `invalid` turns the border amber. */
export function TextField({
  style,
  invalid,
  placeholderTextColor,
  ref,
  ...rest
}: TextInputProps & { invalid?: boolean; ref?: Ref<TextInput> }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? c.ink3}
      style={[styles.input, invalid && { borderColor: c.caution }, style]}
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
