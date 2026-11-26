import type { TextInputProps } from "react-native";
import { TextField } from "@/components/ui";
import { fonts, useColors } from "@/lib/theme";

/**
 * A saved meal's name: the app's text field in a bolder, larger type, at most 60 characters.
 * `filled`: on a white sheet, the grey filled field without an outline (as the add-item sheet).
 */
export function MealNameField({ filled, ...props }: Omit<TextInputProps, "style"> & { filled?: boolean }) {
  const c = useColors();
  return (
    <TextField
      accessibilityLabel="Name"
      maxLength={60}
      returnKeyType="done"
      style={[
        { fontFamily: fonts.sans600, fontSize: 16, outlineWidth: 0 },
        filled && { backgroundColor: c.ground, borderWidth: 0 },
      ]}
      {...props}
    />
  );
}
