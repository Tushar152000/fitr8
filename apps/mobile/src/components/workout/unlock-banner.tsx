import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Check, Dumbbell, Lock } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { useMe } from "@/lib/auth";
import { localYmd } from "@/lib/meal-param";
import { appear } from "@/lib/motion";
import { billingQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { NEW_WORKOUT_BANNER, workoutBannerVisible, type WorkoutBannerState } from "@/lib/workout-banner";

const KEY = (userId: string) => `fitr8.workout.banner.${userId}`;

async function read(userId: string): Promise<WorkoutBannerState> {
  try {
    const raw =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(KEY(userId))
        : await SecureStore.getItemAsync(KEY(userId));
    return raw ? { ...NEW_WORKOUT_BANNER, ...(JSON.parse(raw) as WorkoutBannerState) } : NEW_WORKOUT_BANNER;
  } catch {
    return NEW_WORKOUT_BANNER;
  }
}

async function write(userId: string, s: WorkoutBannerState) {
  try {
    const raw = JSON.stringify(s);
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY(userId), raw);
    else await SecureStore.setItemAsync(KEY(userId), raw);
  } catch {
    // Worst case it shows on a day it would have skipped.
  }
}

const TICKS = [
  "AI coach that adapts to what you eat",
  "Daily workout recommendations",
  "Workout logs and calories burned",
];

/** Design 16: under the meals on Today, free users only. The whole card opens the Workout tab (16a). */
export function WorkoutUnlockBanner() {
  const me = useMe();
  const c = useColors();
  const styles = useStyles();
  const billing = useQuery(billingQuery);
  const [state, setState] = useState<{ s: WorkoutBannerState; today: string } | null>(null);

  useEffect(() => {
    void read(me.id).then((s) => setState({ s, today: localYmd() }));
  }, [me.id]);

  const visible = billing.data?.plan === "FREE" && state !== null && workoutBannerVisible(state.s, state.today);

  const shown = useRef(false);
  useEffect(() => {
    if (!visible || shown.current || !state) return;
    shown.current = true;
    track("workout_banner_shown", {});
    if (!state.s.firstSeen) void write(me.id, { ...state.s, firstSeen: state.today });
  }, [visible, state, me.id]);

  if (!visible) return null;

  return (
    <Animated.View entering={appear}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Your AI workout coach. Unlock workouts with Premium."
        onPress={() => {
          track("workout_banner_tapped", {});
          if (state) void write(me.id, { ...state.s, firstSeen: state.s.firstSeen ?? state.today, tapped: true });
          router.navigate({ pathname: "/workout", params: { source: "banner" } });
        }}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text size={12} weight={700} color={c.brandText} style={{ flex: 1 }}>
            New · Workouts
          </Text>
          <View style={styles.lock}>
            <Lock size={12} color={c.cautionText} />
            <Text size={12} weight={700} color={c.cautionText}>
              Premium
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View style={styles.icon}>
            <Dumbbell size={20} color={c.white} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text weight={700} size={17}>
              Your AI workout coach
            </Text>
            <Text size={14} color={c.ink2}>
              A weekly plan for gym, running or yoga, built around your calories and goal.
            </Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          {TICKS.map((t) => (
            <View key={t} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Check size={16} color={c.protein} strokeWidth={2.5} />
              <Text size={14}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={styles.cta}>
          <Text weight={600} color={c.white}>
            Unlock workouts →
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.premiumLine,
    backgroundColor: c.surface,
  },
  lock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: c.cautionSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    height: 48,
    borderRadius: radius.button,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
  },
}));
