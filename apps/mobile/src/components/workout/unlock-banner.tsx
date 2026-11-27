import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Crown } from "lucide-react-native";
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
import { SmallCta } from "@/components/premium/small-cta";
import { WeekPreview } from "@/components/premium/week-preview";
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

/**
 * Design 16: on Today, free users only. The whole card opens the Workout tab (16a). Redesigned
 * 2026-11-28: a plain theme card (was a dark gradient with a list of ticks) with a short title and a
 * faded sample week (Gym · Run · Rest · Yoga) under a lock pill, so people see what they'd get.
 */
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
        style={({ pressed }) => pressed && { transform: [{ scale: 0.99 }] }}
      >
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="captionStrong" color={c.brandText} style={{ flex: 1 }}>
              NEW · WORKOUTS
            </Text>
            <View style={styles.tag}>
              <Crown size={12} color={c.brandText} strokeWidth={2.2} />
              <Text variant="captionStrong" color={c.brandText}>
                Premium
              </Text>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Text variant="heading2">Your AI workout plan</Text>
            <Text variant="labelMedium" color={c.ink2} style={{ lineHeight: 18 }}>
              A week of gym, running or yoga, built around your calories and goal.
            </Text>
          </View>

          {/* A preview of a week, softly faded with a lock: you see what you'd get. */}
          <WeekPreview locked />

          {/* Visual only: the whole card is the button. */}
          <SmallCta label="Unlock workouts" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 14, padding: 20, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: c.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
}));
