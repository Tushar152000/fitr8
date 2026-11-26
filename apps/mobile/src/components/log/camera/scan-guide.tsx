import { ScanBarcode } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { cam } from "./cam";

/** One sweep, top to bottom (or back). */
const SWEEP_MS = 1800;
/** The sweep stays inside the corner guides: this far in from the viewfinder's top and bottom. */
const INSET_TOP = 0.14;
const INSET_BOTTOM = 0.2; // a little more at the bottom, clear of the hint pill

/**
 * The middle of the viewfinder (Figma "Scan line" + barcode glyph): a lime line glowing across the
 * frame that sweeps up and down like a scanner (user decision 2026-11-27), over a faint barcode
 * glyph, so it reads as "point it at a barcode or a plate". Under Reduce Motion the line holds still
 * just above the middle, as in the design.
 */
export function ScanGuide() {
  const reduce = useReducedMotion();
  const [height, setHeight] = useState(0);
  const t = useSharedValue(0); // 0 = top of the sweep, 1 = bottom

  useEffect(() => {
    if (reduce || height === 0) return;
    t.set(0);
    t.set(withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, height, t]);

  const top = height * INSET_TOP;
  const bottom = height * (1 - INSET_BOTTOM);
  const line = useAnimatedStyle(() => ({
    transform: [{ translateY: reduce ? height * 0.43 : top + (bottom - top) * t.get() }],
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ScanBarcode size={56} color={cam.white} strokeWidth={1.4} absoluteStrokeWidth style={{ opacity: 0.25 }} />
      </View>
      {height > 0 && (
        <Animated.View style={[styles.track, line]}>
          <View style={styles.lineGlow}>
            <LinearGradient
              colors={["rgba(194,224,74,0)", cam.highlight, "rgba(194,224,74,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.line}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  // The moving line: full width, centred, positioned only by translateY.
  track: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  lineGlow: {
    width: 270,
    maxWidth: "77%",
    height: 2,
    borderRadius: 2,
    boxShadow: "0 0 12px rgba(194,224,74,0.6)",
  },
  line: { flex: 1, borderRadius: 2 },
});
