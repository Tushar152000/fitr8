import type { ReactNode } from "react";
import { View } from "react-native";
import { FieldError } from "./field-error";
import { Text } from "./text";

/** A labelled form control with its error under it (onboarding, welcome back, reminders). */
export function FormField({
  label,
  error,
  gap = 10,
  children,
}: {
  label: string;
  error?: string | null;
  gap?: number;
  children: ReactNode;
}) {
  return (
    <View style={{ gap }}>
      <Text variant="label">{label}</Text>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </View>
  );
}
