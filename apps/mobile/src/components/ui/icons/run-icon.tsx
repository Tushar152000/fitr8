import Svg, { Circle, Path } from "react-native-svg";

/** Props shared with lucide icons, so it can sit in the same icon maps. */
export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** As in lucide: keep the stroke this many pixels wide whatever the size. */
  absoluteStrokeWidth?: boolean;
};

/**
 * A running figure in lucide's line style (24 × 24, round caps). Lucide has no runner, so Running
 * used the heartbeat glyph (user feedback 2026-11-28).
 */
export function RunIcon({ size = 24, color = "currentColor", strokeWidth = 2, absoluteStrokeWidth }: IconProps) {
  const stroke = absoluteStrokeWidth ? (strokeWidth * 24) / size : strokeWidth;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={15} cy={4} r={2} />
      <Path d="M13.5 7.5 11 13" />
      <Path d="m13.5 8.2 3 2.3 2.5-.5" />
      <Path d="M13 8 9.5 9l-2 2.5" />
      <Path d="m11 13 3.5 2.5-1 5" />
      <Path d="m11 13-2.5 4-3.5.5" />
    </Svg>
  );
}
