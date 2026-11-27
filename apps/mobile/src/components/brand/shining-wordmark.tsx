import { useEffect } from "react";
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { ClipPath, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { LETTERS, MARK, MARK_FOOT } from "./wordmark";

const W = 185;
const H = 37;
/** Width of the light band, in the wordmark's 185 × 37 units. */
const SHINE_W = 70;
const LIME = "#C2E04A";
const OLIVE = "#718b00";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * The FITR8 wordmark (Figma paths, 185 × 37) with a lime light that sweeps across it once on mount,
 * clipped to the letters. Used by the launch cover and the dark ↔ light switch. `ink` is the
 * wordmark colour; `onDark` picks the band's colours; `play={false}` draws it still.
 */
export function ShiningWordmark({
  ink,
  onDark,
  delayMs = 0,
  durationMs = 760,
  play = true,
}: {
  ink: string;
  onDark: boolean;
  delayMs?: number;
  durationMs?: number;
  play?: boolean;
}) {
  const x = useSharedValue(-SHINE_W);

  useEffect(() => {
    if (!play) return;
    x.set(withDelay(delayMs, withTiming(W + SHINE_W, { duration: durationMs, easing: Easing.inOut(Easing.quad) })));
  }, [play, delayMs, durationMs, x]);

  const band = useAnimatedProps(() => ({ x: x.get() }));

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} accessibilityRole="image" accessibilityLabel="FITR8">
      <Defs>
        <ClipPath id="word">
          <Path d={MARK_FOOT} />
          <Path d={MARK} />
          <Path d={LETTERS} />
        </ClipPath>
        <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0.35">
          <Stop offset="0" stopColor={LIME} stopOpacity={0} />
          <Stop offset="0.45" stopColor={onDark ? LIME : OLIVE} stopOpacity={1} />
          <Stop offset="0.55" stopColor={LIME} stopOpacity={1} />
          <Stop offset="1" stopColor={LIME} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={MARK_FOOT} fill={ink} />
      <Path d={MARK} fill={ink} />
      <Path d={LETTERS} fill={ink} />
      {play && (
        <AnimatedRect y={0} width={SHINE_W} height={H} fill="url(#shine)" clipPath="url(#word)" animatedProps={band} />
      )}
    </Svg>
  );
}
