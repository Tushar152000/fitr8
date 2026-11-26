import { Crown, ScanBarcode } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { cam } from "./cam";

/**
 * The pill at the bottom of the viewfinder: what to point at, "Barcode found" (lime) while a code
 * is in view, or (free plan, both scans locked) a tap through to Premium.
 */
export function ScanHint({ locked, seen, onUnlock }: { locked: boolean; seen: string | null; onUnlock: () => void }) {
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
      <Text variant={seen ? "labelStrong" : "labelMedium"} color={seen ? cam.ink : cam.white} tabular>
        {seen ? `Barcode found · opening ${seen}` : "Point at a barcode, or snap your plate"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
