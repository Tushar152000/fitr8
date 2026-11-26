import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// Figma "Corner TL": a 40 px L with a 12 px inner radius, 4 px round-capped stroke.
const CORNER = "M3 37V15C3 8.373 8.373 3 15 3H37";
const TURN = { tl: 0, tr: 90, br: 180, bl: 270 } as const;

/** Four rounded guides framing the plate, 20 px in from the viewfinder's edges (lime while a barcode is in view). */
export function Corners({ color = "#ffffff" }: { color?: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, { margin: 20, pointerEvents: "none" }]}>
      {(Object.keys(TURN) as (keyof typeof TURN)[]).map((k) => (
        <Svg
          key={k}
          width={40}
          height={40}
          viewBox="0 0 40 40"
          style={{
            position: "absolute",
            [k[0] === "t" ? "top" : "bottom"]: 0,
            [k[1] === "l" ? "left" : "right"]: 0,
            transform: [{ rotate: `${TURN[k]}deg` }],
          }}
        >
          <Path d={CORNER} stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" />
        </Svg>
      ))}
    </View>
  );
}
