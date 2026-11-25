import { Barcode, Crown } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { cam } from "./cam";

/**
 * The pill at the bottom of the viewfinder: what to point at, "Barcode found" while a code is in
 * view, or (free plan, both scans locked) a tap through to Premium.
 */
export function ScanHint({ locked, seen, onUnlock }: { locked: boolean; seen: string | null; onUnlock: () => void }) {
  if (locked) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Scanning is part of FITR8 Premium. See Premium"
        onPress={onUnlock}
        style={[styles.hint, { backgroundColor: cam.brand }]}
      >
        <Crown size={16} color={cam.white} />
        <Text weight={600} size={13} color={cam.white}>
          Photo and barcode scanning are Premium · Try free
        </Text>
      </PressableScale>
    );
  }
  return (
    <View
      style={[styles.hint, { pointerEvents: "none" }, seen && { backgroundColor: cam.protein }]}
      accessibilityLiveRegion="polite"
    >
      {seen && <Barcode size={16} color={cam.white} />}
      <Text weight={600} size={13} color={cam.white} tabular>
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
    bottom: 16,
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(23,24,28,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
