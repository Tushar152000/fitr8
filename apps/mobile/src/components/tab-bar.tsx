import type { SwipeTabBarProps } from "@/components/swipe-tabs";
import { router } from "expo-router";
import {
  Camera,
  Dumbbell,
  LayoutDashboard,
  MessageCircle,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SessionBar } from "@/components/session-bar";
import { GradientFab, PressableScale, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";
import { canLogOn } from "@/lib/meal-param";
import { showDay, useViewDay } from "@/lib/view-day";

/**
 * Tabs shown in the bar, in order (Figma "Tab Bar" Nav Items). The active item is ink with its
 * glyph filled (Home, Workout) or, for Meals, the same glyph drawn bolder (it has no fill; user
 * decision 2026-11-27: the glyph never changes shape); idle items are text/secondary.
 */
const TABS: Record<string, { label: string; icon: LucideIcon; fill?: boolean }> = {
  today: { label: "Home", icon: LayoutDashboard, fill: true },
  meals: { label: "Meals", icon: UtensilsCrossed },
  workout: { label: "Workout", icon: Dumbbell, fill: true },
};

/**
 * Tab bar: one full-width white pill, Home · Meals · [camera] · Workout · Coach, with the round
 * gradient camera raised out of the middle (user choice 2026-11-28; Figma had it beside the pill on
 * the right). A ring in the page colour cuts it out of the bar. Coach and the camera open
 * full-screen stacks (the chat with its keyboard, the logger).
 */
export function TabBar({ state, navigation }: SwipeTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  // On Home or Meals the camera logs to the day being shown; a past day opens typing (long eaten).
  const viewDay = useViewDay();
  const current = state.routes[state.index]?.name;
  const shownDay = current === "today" || current === "meals" ? viewDay : null;
  // A day older than the logging window is read-only: the camera logs today and shows today again.
  const pastDay = shownDay && canLogOn(shownDay) ? shownDay : null;
  // Every tab, always: with SDK 58's router a tab that hasn't been visited yet isn't in
  // `state.routes`, so building the bar from the routes hid Meals / Workout until opened.
  const tabs = Object.keys(TABS).map((name) => ({ name, route: state.routes.find((r) => r.name === name) }));
  // Home · Meals on the left of the camera, Workout (and Coach) on the right.
  const before = tabs.slice(0, 2);
  const after = tabs.slice(2);

  const renderTab = ({ name, route }: (typeof tabs)[number]) => {
    const tab = TABS[name];
    const focused = current === name;
    return (
      <PressableScale
        key={name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        onPress={() => {
          const event = route
            ? navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true })
            : null;
          if (!focused && !event?.defaultPrevented) navigation.navigate(name);
        }}
        style={styles.tab}
      >
        <TabItem tab={tab} focused={focused} />
      </PressableScale>
    );
  };

  return (
    // 24 px under the bar as drawn (the home indicator sits over that space on iPhone).
    <View style={[styles.wrap, { paddingBottom: Math.max(24, insets.bottom - 10) }]}>
      {/* A session in progress (walk, run …): live timer, pause, tap back in. */}
      <SessionBar />
      <View style={styles.pill}>
        {before.map(renderTab)}
        {/* The camera, raised out of the middle of the bar. */}
        <View style={styles.centre}>
          <View style={styles.cutout}>
            <GradientFab
              size={60}
              accessibilityRole="button"
              accessibilityLabel="Log a meal"
              onPress={() => {
                if (shownDay && !pastDay) showDay(null);
                router.push(pastDay ? { pathname: "/log/type", params: { date: pastDay } } : "/log");
              }}
            >
              <Camera size={24} color="#ffffff" strokeWidth={2} absoluteStrokeWidth />
            </GradientFab>
          </View>
        </View>
        {after.map(renderTab)}
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Ask your coach"
          onPress={() => router.push("/coach")}
          style={styles.tab}
        >
          <MessageCircle size={24} color={c.ink2} strokeWidth={2} absoluteStrokeWidth />
          <Text variant="nav" color={c.ink2} numberOfLines={1}>
            Coach
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

/**
 * One tab's glyph and label. The idle (outline, text/secondary) and active (ink, filled or bolder)
 * looks are stacked and cross-fade, so switching tabs never snaps.
 */
function TabItem({ tab, focused }: { tab: (typeof TABS)[string]; focused: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(focused ? 1 : 0, { duration: reduce ? 0 : 200, easing: Easing.out(Easing.quad) }));
  }, [focused, reduce, on]);
  const activeStyle = useAnimatedStyle(() => ({ opacity: on.get() }));
  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - on.get() }));
  return (
    <View style={styles.item}>
      <Animated.View style={[styles.layer, idleStyle]}>
        <tab.icon size={24} color={c.ink2} strokeWidth={2} absoluteStrokeWidth />
        <Text variant="nav" color={c.ink2} numberOfLines={1}>
          {tab.label}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.layer, styles.over, activeStyle]}>
        <tab.icon
          size={24}
          color={c.ink}
          strokeWidth={tab.fill ? 2 : 2.6}
          absoluteStrokeWidth
          fill={tab.fill ? c.ink : "none"}
        />
        <Text variant="nav" color={c.ink} numberOfLines={1}>
          {tab.label}
        </Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    paddingTop: 8,
    paddingHorizontal: 20,
    backgroundColor: c.ground,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: c.surface,
  },
  // 52 wide as drawn; at least 44 tall (24 glyph + 4 + label) with the pill's 8 px makes the 60 px bar.
  tab: { width: 52, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 4 },
  item: { alignItems: "center" },
  // The camera's slot: as wide as a tab, the 60 px button lifted 26 px above the bar's top edge.
  centre: { width: 68, height: 44, alignItems: "center" },
  cutout: {
    position: "absolute",
    top: -34,
    padding: 4,
    borderRadius: 34,
    backgroundColor: c.ground,
  },
  layer: { alignItems: "center", gap: 4 },
  over: { position: "absolute", top: 0, left: -8, right: -8 },
}));
