import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PillButton, Text } from "@/components/ui";
import { answerConfirm, type ConfirmRequest, useConfirmRequest } from "@/lib/confirm";
import { makeStyles, radius, useColors } from "@/lib/theme";

const IN = { duration: 200, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 160, easing: Easing.in(Easing.cubic) };

/**
 * The app's confirm dialog (lib/confirm `confirmAction`): a white card in the middle of a dimmed
 * screen with the question, a line of detail, and Cancel beside the red action. It fades and lifts
 * in, and plays the same in reverse on close. Tapping outside or the system back is Cancel.
 * Rendered once in the root layout.
 */
export function ConfirmDialog() {
  const c = useColors();
  const styles = useStyles();
  const request = useConfirmRequest();
  const reduce = useReducedMotion();
  // The last question stays on screen while the dialog animates out.
  const [shown, setShown] = useState<ConfirmRequest | null>(request);
  if (request && request !== shown) setShown(request);
  const t = useSharedValue(0);

  useEffect(() => {
    if (request) t.set(withTiming(1, reduce ? { duration: 0 } : IN));
    else
      t.set(
        withTiming(0, reduce ? { duration: 0 } : OUT, (done) => {
          if (done) scheduleOnRN(setShown, null);
        }),
      );
  }, [request, reduce, t]);

  const scrim = useAnimatedStyle(() => ({ opacity: t.get() }));
  const card = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * 12 }, { scale: 0.96 + 0.04 * t.get() }],
  }));

  if (!shown) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => answerConfirm(false)}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => answerConfirm(false)} accessibilityLabel="Cancel" />
      </Animated.View>
      <View style={[styles.center, { pointerEvents: "box-none" }]}>
        <Animated.View style={[styles.card, card]} accessibilityViewIsModal accessibilityRole="alert">
          <View style={{ gap: 8 }}>
            <Text variant="heading2" accessibilityRole="header">
              {shown.title}
            </Text>
            {shown.message ? (
              <Text variant="bodySm" color={c.ink2}>
                {shown.message}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <PillButton variant="soft" label="Cancel" style={{ flex: 1 }} onPress={() => answerConfirm(false)} />
            <PillButton variant="danger" label={shown.action} style={{ flex: 1 }} onPress={() => answerConfirm(true)} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  scrim: { backgroundColor: c.scrim },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.sheet,
    backgroundColor: c.surface,
    padding: 24,
    gap: 24,
    ...shadows.card,
  },
  actions: { flexDirection: "row", gap: 10 },
}));
