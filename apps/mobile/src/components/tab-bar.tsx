import type { BottomTabBarProps } from "expo-router/tabs";
import { router } from "expo-router";
import {
  Camera,
  Dumbbell,
  LayoutDashboard,
  MessageCircle,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientFab, PressableScale, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";
import { canLogOn } from "@/lib/meal-param";
import { showDay, useViewDay } from "@/lib/view-day";

/**
 * Tabs shown in the bar, in order (Figma "Tab Bar" Nav Items). The active item is ink with its
 * glyph filled (Home, Workout) or swapped (Meals: fork and knife); idle items are text/secondary.
 */
const TABS: Record<string, { label: string; icon: LucideIcon; active?: LucideIcon; fill?: boolean }> = {
  today: { label: "Home", icon: LayoutDashboard, fill: true },
  meals: { label: "Meals", icon: UtensilsCrossed, active: Utensils },
  workout: { label: "Workout", icon: Dumbbell, fill: true },
};

/**
 * v2 tab bar (Figma "Tab Bar"): a white pill with Home · Meals · Workout · Coach, and the round
 * gradient camera beside it. Coach and the camera open full-screen stacks (the chat with its
 * keyboard, the logger).
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
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
          const color = focused ? c.ink : c.ink2;
          const Icon = focused && tab.active ? tab.active : tab.icon;
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
              <Icon
                size={24}
                color={color}
                strokeWidth={2}
                absoluteStrokeWidth
                fill={focused && tab.fill ? color : "none"}
              />
              <Text variant="nav" color={color} numberOfLines={1}>
                {tab.label}
              </Text>
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
  // 52 wide as drawn; 44 tall (24 glyph + 6 + label) with the pill's 8 px makes the 60 px bar.
  tab: { width: 52, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 6 },
}));
