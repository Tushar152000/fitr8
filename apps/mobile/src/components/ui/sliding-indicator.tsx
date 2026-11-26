import { useEffect, useState } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** How the selection moves between options everywhere (user decision 2026-11-27): one feel. */
export const SLIDE = { duration: 260, easing: Easing.out(Easing.cubic) };

type Box = { x: number; y: number; width: number; height: number };

/**
 * One highlight that slides to the picked option instead of jumping (the meal slider on the camera,
 * the workout week, tiles, single-choice chips). Each option reports its box with `onLayout(i)`;
 * `Indicator` draws the highlight behind (or over) them and glides to option `index` — position and
 * size, so options of different widths and wrapped rows work too. The first placement snaps;
 * Reduce Motion snaps always.
 */
export function useSlidingIndicator(index: number) {
  const reduce = useReducedMotion();
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const shown = useSharedValue(0);
  const target = index >= 0 ? boxes[index] : undefined;
  const tx = target?.x;
  const ty = target?.y;
  const tw = target?.width;
  const th = target?.height;

  useEffect(() => {
    if (tx === undefined || ty === undefined || tw === undefined || th === undefined) {
      shown.set(0);
      return;
    }
    const snap = reduce || shown.get() === 0;
    const to = (v: number) => (snap ? v : withTiming(v, SLIDE));
    x.set(to(tx));
    y.set(to(ty));
    w.set(to(tw));
    h.set(to(th));
    shown.set(1);
  }, [tx, ty, tw, th, reduce, x, y, w, h, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    width: w.get(),
    height: h.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }));

  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x: bx, y: by, width, height } = e.nativeEvent.layout;
    setBoxes((all) => {
      const old = all[i];
      if (old && old.x === bx && old.y === by && old.width === width && old.height === height) return all;
      return { ...all, [i]: { x: bx, y: by, width, height } };
    });
  };

  return { onLayout, style, boxes };
}

/** The sliding highlight: absolutely placed in the options' container, never takes touches. */
export function Indicator({
  slide,
  style,
}: {
  slide: ReturnType<typeof useSlidingIndicator>;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View style={[{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }, style, slide.style]} />
  );
}
