import { X } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { PressableScale, Text } from "@/components/ui";
import { SHEET_CLOSE, SHEET_OPEN, useReduceMotion } from "@/lib/motion";
import { useKeyboardHeight } from "@/lib/use-keyboard";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Bottom sheet (radius 28) over a dimmed backdrop. Tapping the backdrop or the round × button that
 * floats just above the panel's top-right corner (outside the sheet, user decision 2026-11-26; it
 * rides with the panel) closes it. Opening, the
 * backdrop fades in while the panel slides up; closing plays the same in reverse (panel slides down,
 * backdrop fades out) and only then unmounts the Modal, so a sheet never just vanishes. Under Reduce
 * Motion both are instant. The dim layer never slides. The panel
 * rides up with the keyboard (padding on both platforms, as in `Screen`: Android is edge-to-edge),
 * so a field or Save button inside a sheet is never covered.
 *
 * One spec for every sheet: white panel, 36 × 5 grabber 8 px from the top, Heading/H1 title with an
 * optional Label/Medium `subtitle` and `trailing` controls, 16 px between grabber, title and blocks
 * (`gap` overrides), bottom padding max(24, safe area + 8). `figma` keeps the title on one line and
 * allows `bare` (no title row; the content draws its own).
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  trailing,
  figma,
  bare,
  gap,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  figma?: boolean;
  /** `figma` only: no title row; the content draws its own (e.g. to animate it). `title` stays the label. */
  bare?: boolean;
  /** Space between blocks (default 16). */
  gap?: number;
  children: ReactNode;
}) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const reduce = useReduceMotion();
  // Stays true through the closing animation; the Modal unmounts when it ends.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const shown = useSharedValue(0); // 0 = off screen, 1 = open
  const panelH = useSharedValue(screenH);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      shown.set(withTiming(1, reduce ? { duration: 0 } : SHEET_OPEN));
    } else {
      shown.set(
        withTiming(0, reduce ? { duration: 0 } : SHEET_CLOSE, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, mounted, reduce, shown]);

  const backdrop = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - shown.get()) * panelH.get() }] }));
  // Off-screen distance includes the close button floating 52 px above the panel.
  const measure = (h: number) => panelH.set(h + 72);
  // Room above the tallest sheet for the close button, below the status bar, and above the
  // keyboard while it's open (the panel rides up on it and scrolls inside rather than running
  // under the status bar).
  const keyboard = useKeyboardHeight();
  const maxHeight = screenH - insets.top - 72 - keyboard;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          onLayout={(e) => measure(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            { maxHeight, gap: gap ?? 16, paddingBottom: keyboard > 0 ? 16 : Math.max(24, insets.bottom + 8) },
            panel,
          ]}
        >
          <CloseButton onPress={onClose} />
          <View style={styles.grabber} />
          {!(figma && bare) && Boolean(title || trailing) && (
            <View style={styles.head}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="heading1" accessibilityRole="header" numberOfLines={figma ? 1 : undefined}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="labelMedium" color={c.ink2} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {trailing}
            </View>
          )}
          <ScrollView contentContainerStyle={{ gap: gap ?? 16 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** 40 px white circle with ×, 12 px above the panel's top-right corner, 20 from its edge. */
function CloseButton({ onPress }: { onPress: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={8}
      style={styles.close}
    >
      <X size={20} color={c.ink} strokeWidth={2} />
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: c.scrim },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingTop: 8,
    boxShadow: "0 -8px 16px rgba(0, 0, 0, 0.12)",
  },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 100, backgroundColor: c.track },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  close: {
    position: "absolute",
    top: -52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    ...shadows.card,
  },
}));
