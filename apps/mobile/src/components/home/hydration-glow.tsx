import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from "react-native-svg";

/**
 * The hydration card's glow (Figma "Home" hydration card, node 5244:10283): three 70.5 px bands in
 * data/hydration-1, -2 and -3 stacked 21 px apart along the card's bottom edge, under a 50 px
 * Gaussian blur. Drawn as gradients, never an image (a stretched PNG looked soft and banded).
 *
 * A blurred band is separable: its colour down the card is the band's colours blurred vertically,
 * and its fade toward the left and right ends is the band's width blurred horizontally. Both are
 * computed here with the error function and drawn as one vertical gradient masked by one
 * horizontal gradient, so the result matches the blur in Figma on iOS, Android and the web
 * (react-native-svg's native blur is capped at a 25 px radius on Android, too weak for this).
 */
const SIGMA = 50;
const HALF = 70.5 / 2;
/** Band centres, px below the card's bottom edge (Figma card 350 × 137). */
const C1 = 4.25;
const C3 = C1 + 42;
/** Before the blur, from the top: hydration-1 shows 21 px, hydration-2 21 px, hydration-3 its full 70.5 px. */
const SEGMENTS: { from: number; to: number; rgb: [number, number, number] }[] = [
  { from: C1 - HALF, to: C1 - HALF + 21, rgb: [0x2f, 0x97, 0xc1] },
  { from: C1 - HALF + 21, to: C3 - HALF, rgb: [0x35, 0xce, 0xfe] },
  { from: C3 - HALF, to: C3 + HALF, rgb: [0xa6, 0xdd, 0xed] },
];
/** The bands run from 6 px in on the left to 17 px in on the right, plus their round caps. */
const LEFT = 6 - HALF;
const RIGHT_INSET = 17 - HALF;
/**
 * The bands aren't straight: they rise toward the left-middle and dip to the right. Sampled across
 * the card (0, 10 % … 100 % of its width), this is how much brighter or dimmer the glow is there
 * than for a straight band, from the band's path with the same blur.
 */
const WAVE = [0.909, 1.002, 1.095, 1.15, 1.134, 1.048, 0.936, 0.856, 0.836, 0.862, 0.906];
const WAVE_MAX = Math.max(...WAVE);
/** How far up the card the glow reaches before it's fully transparent. */
const REACH = 200;

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26 (max error 1.5e-7).
  const s = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
/** Share of a [from, to] segment that a Gaussian blur of SIGMA spreads onto point p. */
const mass = (p: number, from: number, to: number) =>
  0.5 * (erf((to - p) / (SIGMA * Math.SQRT2)) - erf((from - p) / (SIGMA * Math.SQRT2)));

/** Vertical stops, from REACH above the bottom edge down to it: the blurred band colours. */
const VERTICAL = Array.from({ length: 26 }, (_, i) => {
  const y = -REACH + (REACH * i) / 25; // px relative to the bottom edge (negative = above)
  let a = 0;
  const rgb = [0, 0, 0];
  for (const s of SEGMENTS) {
    const w = mass(y, s.from, s.to);
    a += w;
    for (let k = 0; k < 3; k++) rgb[k] += s.rgb[k] * w;
  }
  const color = a > 0 ? `rgb(${rgb.map((v) => Math.round(v / a)).join(",")})` : "rgb(0,0,0)";
  return { offset: i / 25, color, opacity: Math.min(1, a * WAVE_MAX) };
});

export function HydrationGlow() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  // Horizontal fade: the band's length [LEFT, w - RIGHT_INSET] blurred, sampled across the card.
  const horizontal = Array.from({ length: 11 }, (_, i) => {
    const x = (w * i) / 10;
    return { offset: i / 10, opacity: Math.min(1, (mass(x, LEFT, w - RIGHT_INSET) * WAVE[i]) / WAVE_MAX) };
  });
  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {w > 0 && (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id="hg-v" x1="0" y1={h - REACH} x2="0" y2={h} gradientUnits="userSpaceOnUse">
              {VERTICAL.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </LinearGradient>
            <LinearGradient id="hg-h" x1="0" y1="0" x2={w} y2="0" gradientUnits="userSpaceOnUse">
              {horizontal.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor="#ffffff" stopOpacity={s.opacity} />
              ))}
            </LinearGradient>
            <Mask id="hg-m" x="0" y="0" width={w} height={h} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill="url(#hg-h)" />
            </Mask>
          </Defs>
          <Rect x="0" y={h - REACH} width={w} height={REACH} fill="url(#hg-v)" mask="url(#hg-m)" />
        </Svg>
      )}
    </View>
  );
}
