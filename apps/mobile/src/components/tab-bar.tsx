import type { BottomTabBarProps } from "expo-router/tabs";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Dumbbell, LayoutGrid, MessageCircle, UtensilsCrossed, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { OLIVE_BUTTON } from "@/lib/gradients";
import { makeStyles, useColors } from "@/lib/theme";
import { useViewDay } from "@/lib/view-day";

/** Tabs shown in the bar, in order. Profile is a tab too, opened from Home's profile button. */
const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  today: { label: "Home", icon: LayoutGrid },
  meals: { label: "Meals", icon: UtensilsCrossed },
  workout: { label: "Workout", icon: Dumbbell },
};

/**
 * v2 tab bar: a floating pill with Home · Meals · Workout · Coach, and the camera button beside it.
 * Coach and the camera open full-screen stacks (the chat with its keyboard, the logger).
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  // On Home or Meals the camera logs to the day being shown; a past day opens typing (long eaten).
  const viewDay = useViewDay();
  const current = state.routes[state.index]?.name;
  const pastDay = current === "today" || current === "meals" ? viewDay : null;
  const tabs = Object.keys(TABS)
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof state.routes)[number] => Boolean(r));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.pill}>
        {tabs.map((route) => {
          const tab = TABS[route.name];
          const focused = state.routes[state.index]?.key === route.key;
          const color = focused ? c.ink : c.ink3;
          const Icon = tab.icon;
          return (
            <Pressable
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
              <Icon size={21} color={color} strokeWidth={focused ? 2.4 : 2} fill="none" />
              <Text weight={focused ? 700 : 500} size={11} color={color}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask your coach"
          onPress={() => router.push("/coach")}
          style={styles.tab}
        >
          <MessageCircle size={21} color={c.ink3} strokeWidth={2} />
          <Text weight={500} size={11} color={c.ink3}>
            Coach
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a meal"
        onPress={() => router.push(pastDay ? { pathname: "/log/type", params: { date: pastDay } } : "/log")}
        style={({ pressed }) => [styles.camera, pressed && { transform: [{ scale: 0.96 }] }]}
      >
        <LinearGradient {...OLIVE_BUTTON} style={styles.cameraFill}>
          <Camera size={24} color="#ffffff" strokeWidth={2} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: c.ground,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 64,
    borderRadius: 32,
    paddingHorizontal: 6,
    backgroundColor: c.surface,
    ...shadows.seg,
  },
  tab: { minWidth: 56, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3 },
  // A dark lift, not the old purple FAB glow: the v2 camera is black glass with an olive edge.
  camera: { width: 64, height: 64, borderRadius: 32, boxShadow: "0 8px 18px rgba(20, 24, 0, 0.32)" },
  cameraFill: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(194,224,74,0.5)", // accent/highlight edge on the dark glass
  },
}));
