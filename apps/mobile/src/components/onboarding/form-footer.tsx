import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gutter, makeStyles } from "@/lib/theme";
import { useKeyboardVisible } from "@/lib/use-keyboard";

/** The sticky footer under a long form (onboarding, welcome back): errors, hint and the actions. */
export function FormFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const styles = useStyles();
  return (
    <View style={[styles.footer, { paddingBottom: keyboard ? 12 : Math.max(16, insets.bottom) }]}>{children}</View>
  );
}

const useStyles = makeStyles((c) => ({
  footer: {
    paddingTop: 12,
    paddingHorizontal: gutter,
    gap: 10,
    backgroundColor: c.ground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
}));
