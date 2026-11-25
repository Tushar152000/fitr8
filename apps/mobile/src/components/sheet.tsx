import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import Animated from "react-native-reanimated";
import { sheetIn } from "@/lib/motion";

/**
 * Bottom sheet (radius 28) over a dimmed backdrop. Tapping the backdrop or × closes it. The backdrop
 * fades in while the panel rises (lib/motion `sheetIn`), so the dim layer never slides. The panel
 * rides up with the keyboard (padding on both platforms, as in `Screen`: Android is edge-to-edge),
 * so a field or Save button inside a sheet is never covered.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={sheetIn} style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text variant="h2" style={{ flex: 1 }}>
              {title}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.close}
            >
              <X size={22} color={c.ink2} />
            </PressableScale>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, justifyContent: "flex-end", backgroundColor: c.scrim },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: c.ground,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.lineStrong },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  close: { width: 44, height: 44, marginRight: -10, marginTop: -8, alignItems: "center", justifyContent: "center" },
}));
