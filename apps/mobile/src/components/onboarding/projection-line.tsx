import Svg, { Circle, Line } from "react-native-svg";
import { useColors } from "@/lib/theme";

/** Straight-line projection from now to goal. Decorative; the numbers above carry the meaning. */
export function ProjectionLine({ from, to }: { from: number; to: number }) {
  const c = useColors();
  const w = 300;
  const h = 64;
  const pad = 8;
  const flat = Math.abs(from - to) < 0.1;
  const y1 = flat ? h / 2 : from > to ? pad : h - pad;
  const y2 = flat ? h / 2 : from > to ? h - pad : pad;
  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height={64} aria-hidden>
      <Line x1={pad} y1={y1} x2={w - pad} y2={y2} stroke={c.line} strokeWidth={2} />
      <Line
        x1={pad}
        y1={y1}
        x2={w - pad}
        y2={y2}
        stroke={c.brand}
        strokeWidth={2.5}
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <Circle cx={pad} cy={y1} r={5} fill={c.ink} />
      <Circle cx={w - pad} cy={y2} r={5} fill={c.brand} />
    </Svg>
  );
}
