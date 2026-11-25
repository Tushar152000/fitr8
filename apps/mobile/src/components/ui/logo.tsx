import { View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";
import { fonts, useColors } from "@/lib/theme";
import { Text } from "./text";

// The FITR8 mark (2026-11-24): white angled stroke + lime square, 718 × 711 units; same paths as
// apps/web src/components/logo.tsx.
const MARK_STROKE =
  "M42 0L672 0Q718 0 718 46L718 184Q718 224 678 224L429 224Q426 224 428.1 226.1L681.2 479.2Q718 516 718 568L718 671Q718 711 678 711L560 711Q512 711 478.1 677.1L29.7 228.7Q0 199 0 157L0 42Q0 0 42 0Z";
const MARK_SQUARE = "M40 488L184 488Q224 488 224 528L224 671Q224 711 184 711L40 711Q0 711 0 671L0 528Q0 488 40 488Z";
const MARK_LIME = "#BED465";

/** The FITR8 app icon: the mark on a black tile (docs/DESIGN.md → Brand). 24–40 px in the UI. */
function LogoMark({ size = 32 }: { size?: number; onDark?: boolean }) {
  return (
    <Svg viewBox="0 0 512 512" width={size} height={size}>
      <Rect width="512" height="512" rx="116" fill="#000000" />
      {/* Mark at 50% of the tile width, centred. */}
      <G transform="translate(128 129.25) scale(0.35655)">
        <Path d={MARK_STROKE} fill="#FFFFFF" />
        <Path d={MARK_SQUARE} fill={MARK_LIME} />
      </G>
    </Svg>
  );
}

/** Mark + live wordmark: "FIT" in ink (white on dark), "R8" in the accent (olive; lime on dark). */
export function Logo({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  const c = useColors();
  const fontSize = Math.round(size * 0.7);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }} accessibilityLabel="FITR8">
      <LogoMark size={size} onDark={onDark} />
      <Text
        style={{ fontFamily: fonts.brand700, fontSize, lineHeight: fontSize * 1.1, letterSpacing: -0.02 * fontSize }}
        color={onDark ? c.white : c.ink}
      >
        FIT
        <Text style={{ fontFamily: fonts.brand700, fontSize }} color={c.brandText}>
          R8
        </Text>
      </Text>
    </View>
  );
}
