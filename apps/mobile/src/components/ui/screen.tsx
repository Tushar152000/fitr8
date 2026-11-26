import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useColors, gutter as defaultGutter } from "@/lib/theme";

/**
 * Scrolling screen on the ground colour with the app gutter. `footer` is pinned to the bottom
 * (the one primary action), above the tab bar when the screen has one, and rides up with the
 * keyboard so inputs in it stay visible. Padding on both platforms: the app is edge-to-edge on
 * Android, where the window no longer resizes for the keyboard.
 */
export function Screen({
  children,
  footer,
  gutter = defaultGutter,
  refreshing,
  onRefresh,
  dark,
  contentStyle,
  tabBar,
}: {
  children: ReactNode;
  footer?: ReactNode;
  gutter?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  dark?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** True inside the tabs: the tab bar already covers the bottom safe area. */
  tabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const bottom = tabBar ? 0 : insets.bottom;
  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.root, dark && { backgroundColor: c.panel }]}>
      <ScrollView
        contentContainerStyle={[
          { paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: footer ? 16 : bottom + 32, gap: 18 },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={c.ink3} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      <StatusBarShade dark={dark} />
      {footer && (
        <View
          style={[
            styles.footer,
            { paddingHorizontal: gutter, paddingBottom: Math.max(16, bottom) },
            dark && { backgroundColor: c.panel, borderTopColor: "rgba(255,255,255,0.1)" },
          ]}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.ground },
  footer: {
    paddingTop: 12,
    gap: 10,
    backgroundColor: c.ground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
}));

/**
 * A backdrop behind the status bar (clock, notch, Dynamic Island) for scrolling screens: content
 * scrolled up slides under it and fades out instead of running under the clock. The screen's own
 * colour, then a short fade. Nothing on web or a phone without a top inset.
 */
export function StatusBarShade({ dark }: { dark?: boolean }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  if (insets.top <= 0) return null;
  const bg = dark ? c.panel : c.ground;
  return (
    <View style={[styles.shade, { height: insets.top + 12 }]}>
      <View style={{ height: insets.top, backgroundColor: bg }} />
      <LinearGradient colors={[bg, withAlpha(bg, 0)]} style={{ height: 12 }} />
    </View>
  );
}

/** `#rrggbb` → `rgba(r, g, b, a)` (a transparent end for the fade that keeps the hue). */
function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const styles = StyleSheet.create({
  shade: { position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none" },
});

/** A white card with the standard radius and padding. */
export function Card({
  children,
  style,
  dark,
  ...props
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
} & Omit<ViewProps, "style">) {
  const cardStyles = useCardStyles();
  return (
    <View {...props} style={[cardStyles.card, dark && cardStyles.dark, style]}>
      {children}
    </View>
  );
}

const useCardStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: 18, padding: 14, gap: 10 },
  dark: { backgroundColor: c.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: c.panelLine },
}));
