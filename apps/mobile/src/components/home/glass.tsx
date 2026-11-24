import { useEffect, useId } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Tumbler in a 24 × 30 box: wide rim, slightly narrower base.
const CUP = "M2 2 H22 L19.5 27 Q19.3 28.5 17.8 28.5 H6.2 Q4.7 28.5 4.5 27 Z";
const TOP = 3; // where a full glass's water line sits
const BOTTOM = 28.5;

/**
 * A glass of water. `full` animates the water in (rises from the bottom with a slosh that settles,
 * a droplet, a small bounce) or out (drains). `still` draws it without motion (the small legend icon).
 * Water uses data/hydration-3 → data/hydration-2; the empty glass is frosted with a + to add one.
 */
export function Glass({ full, size, still }: { full: boolean; size: number; still?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = useReducedMotion() || still;
  const level = useSharedValue(full ? 1 : 0); // 0 empty … 1 full
  const slosh = useSharedValue(0); // wave height, decays to 0
  const phase = useSharedValue(0); // wave travel
  const drop = useSharedValue(0); // droplet: 0 hidden … 1 done
  const scale = useSharedValue(1);

  useEffect(() => {
    const target = full ? 1 : 0;
    if (reduce) {
      level.set(target);
      return;
    }
    level.set(withTiming(target, { duration: full ? 720 : 520, easing: Easing.out(Easing.cubic) }));
    slosh.set(
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 1100, easing: Easing.out(Easing.quad) }),
      ),
    );
    phase.set(0);
    phase.set(withTiming(Math.PI * 4, { duration: 1200, easing: Easing.out(Easing.quad) }));
    scale.set(withSequence(withTiming(0.88, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 260 })));
    if (full) {
      drop.set(0);
      drop.set(withDelay(260, withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) })));
    }
    // Shared values are stable; only `full` should re-run the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  const water = useAnimatedProps(() => {
    const y = BOTTOM - (BOTTOM - TOP) * level.get();
    const amp = 1.6 * slosh.get() * Math.min(1, level.get() * 4);
    const p = phase.get();
    // Two bumps across the glass, moving with the phase: the surface rocks and settles.
    const y1 = y + Math.sin(p) * amp;
    const y2 = y - Math.sin(p) * amp;
    return { d: `M0 ${y} Q6 ${y1} 12 ${y} Q18 ${y2} 24 ${y} L24 31 L0 31 Z` };
  });
  const plus = useAnimatedProps(() => ({ opacity: Math.max(0, 1 - level.get() * 2.2) }));
  const droplet = useAnimatedProps(() => {
    const t = drop.get();
    return { cy: 6 - t * 9, opacity: t > 0 && t < 1 ? 1 - t : 0, r: 1.6 };
  });
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const w = size * 0.8;
  return (
    <Animated.View style={bounce}>
      <Svg width={w} height={size} viewBox="0 -4 24 34">
        <Defs>
          <ClipPath id={`cup${id}`}>
            <Path d={CUP} />
          </ClipPath>
          <LinearGradient id={`water${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#a6dded" />
            <Stop offset="1" stopColor="#35cefe" />
          </LinearGradient>
          <LinearGradient id={`frost${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0.78} />
          </LinearGradient>
        </Defs>
        {/* Frosted glass body, then the water clipped to it. */}
        <Path d={CUP} fill={`url(#frost${id})`} />
        <G clipPath={`url(#cup${id})`}>
          <AnimatedPath animatedProps={water} fill={`url(#water${id})`} />
        </G>
        {/* Rim, reflection streak and outline make it read as glass. */}
        <Path d={CUP} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1} />
        <Path d="M2.4 2.6 H21.6" stroke="rgba(166,221,237,0.9)" strokeWidth={1.1} strokeLinecap="round" />
        <Path d="M5.4 6 L6.6 24" stroke="rgba(255,255,255,0.75)" strokeWidth={1.3} strokeLinecap="round" />
        <AnimatedG animatedProps={plus}>
          <Path d="M12 10.5 V19.5 M7.5 15 H16.5" stroke="#0e0e0e" strokeWidth={1.8} strokeLinecap="round" />
        </AnimatedG>
        <AnimatedCircle animatedProps={droplet} cx={15} fill="#a6dded" />
      </Svg>
    </Animated.View>
  );
}
