import type { TextInputProps } from "react-native";
import { TextField } from "@/components/ui";
import { fonts } from "@/lib/theme";

/** A saved meal's name: the app's text field in a bolder, larger type, at most 60 characters. */
export function MealNameField(props: Omit<TextInputProps, "style">) {
  return (
    <TextField
      accessibilityLabel="Name"
      maxLength={60}
      returnKeyType="done"
      style={{ fontFamily: fonts.sans600, fontSize: 17 }}
      {...props}
    />
  );
}
