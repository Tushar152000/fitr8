import { ScanBarcode } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cam } from "./cam";

/**
 * The middle of the viewfinder (Figma "Scan line" + barcode glyph): a lime line glowing across the
 * frame with a faint barcode under it, so it reads as "point it at a barcode or a plate".
 */
export function ScanGuide() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { pointerEvents: "none" }]}>
      <View style={styles.lineGlow}>
        <LinearGradient
          colors={["rgba(194,224,74,0)", cam.highlight, "rgba(194,224,74,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.line}
        />
      </View>
      <ScanBarcode size={56} color={cam.white} strokeWidth={1.4} absoluteStrokeWidth style={{ opacity: 0.25 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Line at 200 of 470, glyph 5 px under it: the pair sits just above the middle.
  center: { alignItems: "center", justifyContent: "center", paddingBottom: 7, gap: 5 },
  lineGlow: {
    width: 270,
    maxWidth: "77%",
    height: 2,
    borderRadius: 2,
    boxShadow: "0 0 12px rgba(194,224,74,0.6)",
  },
  line: { flex: 1, borderRadius: 2 },
});
