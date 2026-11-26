import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, FeGaussianBlur, Filter, G, Path } from "react-native-svg";
import { palettes } from "@/lib/palette";

/**
 * Figma "Group 671040/671041": three wide strokes blurred (σ 50) into a soft light that rises from
 * the bottom of a dark card (coach hero, today's recovery) or the camera's viewfinder. Fixed art in
 * both themes, like the gradients: the cards it sits on are always dark.
 */
const TONES = {
  /** Olive → lime → pale lime (coach hero, workout recovery card). */
  lime: ["#3d4a00", "#d0ff00", "#f4ffc2"],
  /** data/hydration-1..3 (the camera's viewfinder). */
  aqua: [palettes.light.hydration1, palettes.light.hydration2, palettes.light.hydration3],
} as const;

// The Figma vector, one stroke drawn three times 21 px apart; the SVG frame adds the blur's
// 135.25 px bleed on every side of the 327 × 83 group.
const WAVE =
  "M135.25 176.25C136.48 175.167 149.104 166.492 168.193 153.652C180.255 145.538 185.54 142.648 190.971 140.995C195.903 139.495 201.06 139.089 208.509 138.396C214.795 137.811 219.693 136.891 226.82 136.211C242.905 134.675 261.486 135.251 273.885 136.067C280.119 136.477 286.77 139.073 292.206 140.438C299.732 142.328 311.234 147.239 320.923 150.548C332.392 154.464 338.009 156.013 343.138 156.841C349.469 157.864 354.778 160.392 362.227 162.167C369.209 163.831 376.821 164.213 385.205 164.906C396.326 165.825 413.154 164.508 420.761 162.593C430.661 160.101 435.513 155.767 440.031 152.618C444.257 149.674 449.487 146.747 454.779 142.918C456.027 142.09 457.257 141.549 458.352 140.864C459.446 140.179 460.369 139.368 462.25 138.531";
const BLEED = 135.25;
const W = 597.509;
const H = 353.5;

/**
 * The glow, placed like the Figma group: `left` and `bottom` are the 327 × 83 group's offsets from
 * the parent's left and bottom edges (negative = below the card). The parent clips it
 * (`overflow: "hidden"` with its radius).
 */
export function Glow({
  tone = "lime",
  opacity = 0.7,
  left,
  bottom,
}: {
  tone?: keyof typeof TONES;
  opacity?: number;
  left: number;
  bottom: number;
}) {
  // SVG ids can't hold the ":" React puts in useId.
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View
      style={{
        position: "absolute",
        left: left - BLEED,
        bottom: bottom - BLEED,
        width: W,
        height: H,
        pointerEvents: "none",
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <Filter id={id} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse">
            <FeGaussianBlur stdDeviation={50} />
          </Filter>
        </Defs>
        <G opacity={opacity} filter={`url(#${id})`}>
          {TONES[tone].map((color, i) => (
            <Path
              key={color}
              d={WAVE}
              transform={`translate(0 ${i * 21})`}
              stroke={color}
              strokeWidth={70.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}
