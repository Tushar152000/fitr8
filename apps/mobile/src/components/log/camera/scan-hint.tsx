import { Crown, ScanBarcode } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { PressableScale, Text } from "@/components/ui";
import { cam } from "./cam";

/**
 * The pill near the bottom of the viewfinder, still (it doesn't move with the scan line), just above
 * the bottom corner guides (user decision 2026-11-27): what to point at, "Barcode found" (lime)
 * while a code is in view, or (free plan, both scans locked) a tap through to Premium. Idle, it
 * rotates short framing tips every 3 s (2026-11-28): hold above the plate, fit every bowl in, light,
 * or a barcode.
 */
const TIPS = [
  "Hold your phone above the plate",
  "Fit every bowl in the frame",
  "Good light reads best · tap ⚡ if dim",
  "Or point at a barcode",
];
export function ScanHint({ locked, seen, onUnlock }: { locked: boolean; seen: string | null; onUnlock: () => void }) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    if (locked || seen) return;
    const id = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(id);
  }, [locked, seen]);
  if (locked) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Scanning is part of FITR8 Premium. See Premium"
        onPress={onUnlock}
        style={styles.hint}
      >
        <Crown size={12} color={cam.highlight} strokeWidth={2.4} absoluteStrokeWidth />
        <Text variant="labelMedium" color={cam.white}>
          Scanning is Premium ·{" "}
          <Text variant="labelStrong" color={cam.highlight}>
            Try free
          </Text>
        </Text>
      </PressableScale>
    );
  }
  return (
    <View
      style={[styles.hint, { pointerEvents: "none" }, seen && { backgroundColor: cam.highlight }]}
      accessibilityLiveRegion="polite"
    >
      {seen && <ScanBarcode size={14} color={cam.ink} strokeWidth={2} absoluteStrokeWidth />}
      {seen ? (
        <Text variant="labelStrong" color={cam.ink} tabular>
          {`Barcode found · opening ${seen}`}
        </Text>
      ) : (
        <Animated.View key={tip} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)}>
          <Text variant="labelMedium" color={cam.white}>
            {TIPS[tip]}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "absolute",
    bottom: 64,
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
