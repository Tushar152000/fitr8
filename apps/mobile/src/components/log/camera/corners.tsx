import { StyleSheet, View } from "react-native";

/** Four L-shaped guides framing the plate (green while a barcode is in view). */
export function Corners({ color = "rgba(255,255,255,0.85)" }: { color?: string }) {
  const c = { position: "absolute" as const, width: 36, height: 36, borderColor: color };
  return (
    <View style={[StyleSheet.absoluteFill, { margin: 20, pointerEvents: "none" }]}>
      <View style={[c, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 }]} />
      <View style={[c, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 }]} />
      <View style={[c, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 }]} />
      <View
        style={[c, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 }]}
      />
    </View>
  );
}
