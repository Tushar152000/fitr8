import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

/** Height of the wavy top edge strip; the wave's amplitude is half of it. */
const STRIP = 14;

/** A repeating sine edge from x = 0 to `width`, period `period`, filled down to the strip's bottom. */
function wavePath(width: number, period: number, amp: number) {
  const mid = STRIP / 2;
  let d = `M0 ${mid}`;
  for (let x = 0; x < width; x += period) {
    d += ` Q${x + period / 4} ${mid - amp} ${x + period / 2} ${mid} T${x + period} ${mid}`;
  }
  return `${d} L${width} ${STRIP} L0 ${STRIP} Z`;
}

/**
 * Water filling a card from the bottom (Home hydration card, 2026-11-28): two layered waves (a
 * slower, lighter one behind) whose level rises with a spring to `level` (0..1 of `height`). The
 * edge drifts sideways on a loop; `bump` (a counter) makes the surface swell once, for a splash
 * when water is added. Reduce Motion: still water at the level.
 */
export function WaterWave({
  width,
  height,
  level,
  bump,
  front,
  back,
}: {
  width: number;
  height: number;
  level: number;
  bump: number;
  /** Fill of the front wave and the water under it. */
  front: string;
  /** Fill of the back wave (shows only along the edge). */
  back: string;
}) {
  const reduce = useReducedMotion();
  const h = useSharedValue(level * height);
  const swell = useSharedValue(0);
  const phase = useSharedValue(0);

  useEffect(() => {
    h.set(reduce ? level * height : withSpring(level * height, { damping: 14, stiffness: 90 }));
  }, [level, height, reduce, h]);

  useEffect(() => {
    if (reduce || bump === 0) return;
    swell.set(
      withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [bump, reduce, swell]);

  useEffect(() => {
    if (reduce) return;
    phase.set(withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(phase);
  }, [reduce, phase]);

  const period = Math.max(80, width / 2.2);
  const frontStyle = useAnimatedStyle(() => ({
    height: h.get() + STRIP * (1 + swell.get() * 0.6),
    transform: [{ translateX: -phase.get() * period }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    height: h.get() + STRIP * (1.4 + swell.get() * 0.8),
    transform: [{ translateX: -period + phase.get() * period }],
  }));

  if (width <= 0) return null;
  const stripW = width + period * 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Layer style={backStyle} width={stripW} d={wavePath(stripW, period, 4)} fill={back} />
      <Layer style={frontStyle} width={stripW} d={wavePath(stripW, period * 1.15, 5)} fill={front} />
    </View>
  );
}

function Layer({
  style,
  width,
  d,
  fill,
}: {
  style: ReturnType<typeof useAnimatedStyle>;
  width: number;
  d: string;
  fill: string;
}) {
  return (
    <Animated.View style={[styles.layer, { width }, style]}>
      <Svg width={width} height={STRIP}>
        <Path d={d} fill={fill} />
      </Svg>
      <View style={{ flex: 1, backgroundColor: fill, marginTop: -0.5 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, bottom: 0 },
});
