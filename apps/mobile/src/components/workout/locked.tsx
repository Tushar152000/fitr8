import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Dumbbell, Flame, Lock, MessageCircle, type LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, PressableScale, Screen, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { LIST_PRICE, openPaywall } from "@/lib/premium";
import { restorePurchases } from "@/lib/purchases";
import { billingQuery, planQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { showToast } from "@/lib/toast";
import { ACTIVITY_LABEL, dayColors, DAY_LABEL } from "@/lib/training";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { DayType } from "@fitr8/contracts";

const FEATURES: { icon: LucideIcon; title: string; line: string }[] = [
  { icon: MessageCircle, title: "AI coach", line: "Adjusts today's session to your food, sleep and energy" },
  { icon: CalendarDays, title: "Weekly plan", line: "Gym, running, yoga or a mix, Monday to Sunday" },
  { icon: Dumbbell, title: "Exercise logs", line: "Log sets in seconds; weights go up when you're ready" },
  { icon: Flame, title: "Calories burned", line: "See what each day burns and your weekly total" },
];

/** A sample week behind the lock (the user's own one is built after unlocking). */
const PREVIEW: DayType[] = ["gym", "run", "yoga", "gym", "walk", "hiit", "rest"];

const GOAL: Record<string, string> = {
  FAT_LOSS: "Lose fat",
  MUSCLE_GAIN: "Build muscle",
  RECOMPOSITION: "Recomposition",
};

/** 16a: the Workout tab for free users. Their own numbers on a locked week, then Premium. */
export function WorkoutLocked({ source }: { source: "banner" | "tab" }) {
  const c = useColors();
  const styles = useStyles();
  const me = useMe();
  const plan = useQuery(planQuery);
  const [restoring, setRestoring] = useState(false);

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("workout_locked_viewed", { source });
  }, [source]);

  const goal = plan.data ? GOAL[plan.data.goal.type] : null;
  const weight = plan.data ? `${plan.data.metric.weightKg} kg` : null;
  const activity = me.profile ? ACTIVITY_LABEL[me.profile.activityLevel] : null;
  const facts = [goal, weight, activity].filter(Boolean).join(" · ");

  async function alreadyPremium() {
    setRestoring(true);
    try {
      await restorePurchases();
      await api("/api/billing/refresh", { method: "POST" });
      const now = await queryClient.fetchQuery({ ...billingQuery, staleTime: 0 });
      // Premium: the tab re-renders into setup (16b) on its own.
      if (now.plan !== "PRO") showToast("No Premium found on this account");
    } catch {
      showToast("Couldn't check your purchases. Try again.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Screen tabBar>
      <View style={{ gap: 10 }}>
        <View style={styles.chip}>
          <Lock size={14} color={c.brandText} />
          <Text weight={700} size={12} color={c.brandText}>
            Premium · Workouts
          </Text>
        </View>
        <Text variant="h1">Workouts built around your calories</Text>
        <Text color={c.ink2}>
          Your AI coach plans every day of the week for your goal, then adjusts it to what you eat and how you feel.
        </Text>
      </View>

      {/* Locked week preview with the user's own data. */}
      <View style={styles.preview} accessible accessibilityLabel={`Your week is ready to build. ${facts}`}>
        <View style={{ flexDirection: "row", gap: 6, opacity: 0.35 }} importantForAccessibility="no-hide-descendants">
          {PREVIEW.map((t, i) => {
            const col = dayColors(c, t);
            return (
              <View key={i} style={[styles.previewDay, { backgroundColor: col.soft }]}>
                <View style={[styles.dot, { backgroundColor: col.fg }]} />
                <Text size={10} weight={700} color={col.fg}>
                  {DAY_LABEL[t]}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ gap: 8, opacity: 0.25 }} importantForAccessibility="no-hide-descendants">
          <View style={[styles.bar, { width: "70%" }]} />
          <View style={[styles.bar, { width: "90%" }]} />
          <View style={[styles.bar, { width: "55%" }]} />
        </View>
        <View style={styles.lockOverlay}>
          <View style={styles.lockIcon}>
            <Lock size={20} color={c.white} />
          </View>
          <Text weight={700} size={16} center>
            Your week is ready to build
          </Text>
          {facts ? (
            <Text size={13} color={c.ink2} center tabular>
              {facts}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.grid}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <f.icon size={18} color={c.brandText} />
            </View>
            <Text weight={700}>{f.title}</Text>
            <Text size={13} color={c.ink2}>
              {f.line}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <Button onPress={() => openPaywall("workout_tab")}>
          {`Unlock with Premium · from ${LIST_PRICE.perMonth}/month`}
        </Button>
        <PressableScale
          accessibilityRole="button"
          onPress={alreadyPremium}
          disabled={restoring}
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text weight={600} color={c.brandText}>
            {restoring ? "Checking your purchases…" : "Already Premium? Set up your plan"}
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: c.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  preview: {
    gap: 16,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.premiumLine,
    backgroundColor: c.surface,
    overflow: "hidden",
    minHeight: 190,
  },
  previewDay: {
    flex: 1,
    height: 56,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bar: { height: 12, borderRadius: 6, backgroundColor: c.track },
  lockOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 16,
  },
  lockIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  feature: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 6,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: c.surface,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
}));
