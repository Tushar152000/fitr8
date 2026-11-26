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
 * v2 tab bar (Figma "Tab Bar"): a white pill with Home · Meals · Workout · Coach, and the round
 * gradient camera beside it. Coach and the camera open full-screen stacks (the chat with its
 * keyboard, the logger).
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
  const tabs = Object.keys(TABS)
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof state.routes)[number] => Boolean(r));

  return (
    // 24 px under the bar as drawn (the home indicator sits over that space on iPhone).
    <View style={[styles.wrap, { paddingBottom: Math.max(24, insets.bottom - 10) }]}>
      <View style={styles.pill}>
        {tabs.map((route) => {
          const tab = TABS[route.name];
          const focused = state.routes[state.index]?.key === route.key;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <TabItem tab={tab} focused={focused} />
            </PressableScale>
          );
        })}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 20,
    backgroundColor: c.ground,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: c.surface,
  },
  // 52 wide as drawn; at least 44 tall (24 glyph + 4 + label) with the pill's 8 px makes the 60 px bar.
  tab: { width: 52, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 4 },
  item: { alignItems: "center" },
  layer: { alignItems: "center", gap: 4 },
  over: { position: "absolute", top: 0, left: -8, right: -8 },
}));
