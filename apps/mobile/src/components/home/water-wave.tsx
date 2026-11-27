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
/** How far the water body reaches below the card, so a 7° tilt never lifts a corner into view. */
const SINK = 36;

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
 * when water is added. 2026-11-28: `replay` (a counter, e.g. Home coming into view) fills from empty
 * up to the level; `slosh` (a counter: a tap now, a shake once motion sensing is added) tilts the
 * water side to side and swells it, settling like water in a glass; a soft white tide line runs
 * along the front wave's crest. Reduce Motion: still water at the level.
 */
export function WaterWave({
  width,
  height,
  level,
  bump,
  replay = 0,
  slosh = 0,
  front,
  back,
}: {
  width: number;
  height: number;
  level: number;
  bump: number;
  /** Change it to fill again from empty (Home coming into view). */
  replay?: number;
  /** Change it to make the water slosh (tap / shake). */
  slosh?: number;
  /** Fill of the front wave and the water under it. */
  front: string;
  /** Fill of the back wave (shows only along the edge). */
  back: string;
}) {
  const reduce = useReducedMotion();
  // Starts empty so the first render fills up to the level.
  const h = useSharedValue(reduce ? level * height : 0);
  const swell = useSharedValue(0);
  const phase = useSharedValue(0);
  const tilt = useSharedValue(0);

  useEffect(() => {
    h.set(reduce ? level * height : withSpring(level * height, { damping: 14, stiffness: 90 }));
  }, [level, height, reduce, h]);

  // Fill again from empty (e.g. each time Home comes into view).
  useEffect(() => {
    if (reduce || replay === 0) return;
    h.set(0);
    h.set(withSpring(level * height, { damping: 15, stiffness: 70 }));
    // Only on replay; the level effect above follows later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay]);

  // Slosh: tilt one way, back the other, smaller each time, while the surface swells.
  useEffect(() => {
    if (reduce || slosh === 0) return;
    const ease = Easing.inOut(Easing.quad);
    tilt.set(
      withSequence(
        withTiming(7, { duration: 160, easing: ease }),
        withTiming(-5, { duration: 260, easing: ease }),
        withTiming(3, { duration: 260, easing: ease }),
        withTiming(-1.5, { duration: 240, easing: ease }),
        withTiming(0, { duration: 260, easing: ease }),
      ),
    );
    swell.set(
      withSequence(
        withTiming(1.6, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [slosh, reduce, tilt, swell]);

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
    height: SINK + h.get() + STRIP * (1 + swell.get() * 0.6),
    transform: [{ translateX: -phase.get() * period }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    height: SINK + h.get() + STRIP * (1.4 + swell.get() * 0.8),
    transform: [{ translateX: -period + phase.get() * period }],
  }));

  // The water tilts as one body around the bottom middle; it's wider than the card so no edge shows.
  const tilted = useAnimatedStyle(() => ({ transformOrigin: "50% 100%", transform: [{ rotate: `${tilt.get()}deg` }] }));

  if (width <= 0) return null;
  const stripW = width + period * 2;
  const frontPath = wavePath(stripW, period * 1.15, 5);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.water, tilted]}>
        <Layer style={backStyle} width={stripW} d={wavePath(stripW, period, 4)} fill={back} />
        <Layer style={frontStyle} width={stripW} d={frontPath} fill={front} tide={crestOf(frontPath)} />
      </Animated.View>
    </View>
  );
}

/** Just the wavy top edge of a wave path (no fill closing), for the tide line. */
const crestOf = (d: string) => d.split(" L")[0]!;

function Layer({
  style,
  width,
  d,
  fill,
  tide,
}: {
  style: ReturnType<typeof useAnimatedStyle>;
  width: number;
  d: string;
  fill: string;
  /** A soft white line along the crest (the front wave). */
  tide?: string;
}) {
  return (
    <Animated.View style={[styles.layer, { width }, style]}>
      <Svg width={width} height={STRIP}>
        <Path d={d} fill={fill} />
        {tide && <Path d={tide} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.6} strokeLinecap="round" />}
      </Svg>
      <View style={{ flex: 1, backgroundColor: fill, marginTop: -0.5 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, bottom: 0 },
  // Wider than the card each side and SINK lower, so a tilt never shows an edge (heights add SINK back).
  water: { position: "absolute", left: -40, right: -40, top: 0, bottom: -SINK },
});
