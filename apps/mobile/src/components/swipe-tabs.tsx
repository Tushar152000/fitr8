import { withLayoutContext } from "expo-router";
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigationHelpers,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { markSwipeEnded } from "@/components/home/day-pager";
import { haptic } from "@/lib/haptics";

/** Settling after a swipe, and the slide when a tab is tapped. */
const SETTLE_MS = 300;
const EASE = Easing.out(Easing.cubic);
/** A swipe changes tab past a quarter of the screen, or on a flick. */
const SWIPE_FRACTION = 0.25;
const SWIPE_VELOCITY = 500;
/** Pulling past Home or Workout: the row moves this fraction of the finger, then springs back. */
const EDGE_RESISTANCE = 0.2;

export type SwipeTabBarProps = {
  state: TabNavigationState<ParamListBase>;
  navigation: NavigationHelpers<ParamListBase, { tabPress: { data: undefined; canPreventDefault: true } }>;
};

type Props = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  object,
  { tabPress: { data: undefined; canPreventDefault: true } },
  unknown
> &
  TabRouterOptions & { tabBar: (props: SwipeTabBarProps) => ReactNode };

/**
 * The main tabs as one horizontal row of pages, like Instagram (user decision 2026-11-26): a
 * sideways swipe anywhere drags the row with the finger, so the next tab slides in alongside, and
 * letting go settles on a tab. It stops at the first and last tab (no wrap) with a little give.
 * Tapping a tab in the bar slides the row the same way. A tab is mounted once it's the current tab
 * or next to it, and stays mounted (so swiping never shows an empty page). Vertical scrolling wins
 * when the finger moves up/down first.
 */
function SwipeTabNavigator({ tabBar, ...options }: Props) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    object,
    { tabPress: { data: undefined; canPreventDefault: true } }
  >(TabRouter, options);
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const count = state.routes.length;
  const index = state.index;

  // Tabs mounted so far: the current one and its neighbours, kept once mounted.
  const [mounted, setMounted] = useState<Set<string>>(() => new Set());
  const near = state.routes.filter((_, i) => Math.abs(i - index) <= 1).map((r) => r.key);
  if (near.some((k) => !mounted.has(k))) setMounted(new Set([...mounted, ...near]));

  // Position in pages (0 = first tab); the row sits at -pos × width.
  const pos = useSharedValue(index);
  const start = useSharedValue(index);
  const w = useSharedValue(width);
  useEffect(() => {
    w.set(width);
  }, [width, w]);
  const lastIndex = useRef(index);
  useEffect(() => {
    pos.set(withTiming(index, { duration: reduce ? 0 : SETTLE_MS, easing: EASE }));
    if (lastIndex.current !== index) haptic.select(); // a tab change, by swipe or tap
    lastIndex.current = index;
  }, [index, reduce, pos]);

  const total = useSharedValue(count);
  useEffect(() => {
    total.set(count);
  }, [count, total]);

  // The gesture is built once per tab list: one rebuilt on every render makes gesture-handler
  // re-attach mid-touch (on web that throws "releasePointerCapture: Invalid pointer id"). `go`
  // changes only with the tab list; everything else the gesture reads is a shared value.
  const routes = state.routes;
  const go = useCallback(
    (i: number) => {
      const route = routes[i];
      if (route) navigation.navigate(route.name);
    },
    [navigation, routes],
  );
  const pan = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-12, 12])
      .onStart(() => {
        start.set(pos.get());
      })
      .onUpdate((e) => {
        const last = total.get() - 1;
        let p = start.get() - e.translationX / w.get();
        if (p < 0) p *= EDGE_RESISTANCE;
        if (p > last) p = last + (p - last) * EDGE_RESISTANCE;
        pos.set(p);
      })
      .onEnd((e) => {
        const from = Math.round(start.get());
        const moved = pos.get() - from;
        let to = from;
        if (moved > SWIPE_FRACTION || e.velocityX < -SWIPE_VELOCITY) to = from + 1;
        else if (moved < -SWIPE_FRACTION || e.velocityX > SWIPE_VELOCITY) to = from - 1;
        to = Math.max(0, Math.min(total.get() - 1, to));
        pos.set(withTiming(to, { duration: SETTLE_MS, easing: EASE }));
        if (to !== from) scheduleOnRN(go, to);
        if (Platform.OS === "web") scheduleOnRN(markSwipeEnded);
      });
  }, [go, pos, start, w, total]);

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: -pos.get() * w.get() }] }));

  return (
    <NavigationContent>
      <View style={styles.root}>
        <GestureDetector gesture={pan}>
          <View style={styles.viewport}>
            {/* As wide as all tabs together: Android only delivers touches inside a view's own bounds, so
                pages laid out past a screen-wide row couldn't scroll or be tapped. */}
            <Animated.View style={[styles.row, { width: width * count }, row]}>
              {state.routes.map((route, i) => {
                const focused = i === index;
                return (
                  <View
                    key={route.key}
                    style={[styles.page, { left: i * width, width }]}
                    // Off-screen tabs are hidden from screen readers and can't take taps.
                    importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
                    accessibilityElementsHidden={!focused}
                    aria-hidden={!focused}
                  >
                    {mounted.has(route.key) ? descriptors[route.key].render() : null}
                  </View>
                );
              })}
            </Animated.View>
          </View>
        </GestureDetector>
        {tabBar({ state, navigation })}
      </View>
    </NavigationContent>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1, overflow: "hidden" },
  row: { position: "absolute", top: 0, bottom: 0, left: 0 },
  page: { position: "absolute", top: 0, bottom: 0 },
});

const { Navigator } = createNavigatorFactory(SwipeTabNavigator)();

/** expo-router layout for the swipeable tabs (app/(tabs)/_layout.tsx). */
export const SwipeTabs = withLayoutContext(Navigator);
