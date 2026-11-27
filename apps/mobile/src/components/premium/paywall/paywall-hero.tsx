import { useQuery } from "@tanstack/react-query";
import { Camera, Dumbbell, Sparkles, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Text } from "@/components/ui";
import { appear } from "@/lib/motion";
import type { PaywallSource } from "@/lib/premium";
import { GOAL_LABEL, monthYear } from "@/lib/profile-summary";
import { planQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { CoachDemo } from "../coach-demo";
import { PhotoDemo } from "../photo-demo";
import { WeekPreview } from "../week-preview";

type Focus = "photo" | "coach" | "workouts";

/** Which feature the person came for, from where the paywall was opened. */
function focusOf(source: PaywallSource): Focus {
  if (source === "locked_coach") return "coach";
  if (source === "locked_workouts" || source === "workout_tab") return "workouts";
  return "photo";
}

const OUTCOMES: Record<Focus, { icon: LucideIcon; text: string }> = {
  photo: { icon: Camera, text: "Log a meal in one snap" },
  coach: { icon: Sparkles, text: "A coach that knows your day" },
  workouts: { icon: Dumbbell, text: "A workout plan built for you" },
};

const PREVIEW_TITLE: Record<Focus, string> = {
  photo: "Snap your plate, we do the rest",
  coach: "Ask anything about your day",
  workouts: "Your week, planned around your goal",
};

/**
 * The paywall's first screen (redesign 2026-11-28, user request): a personal headline from the
 * goal ("Reach 70 kg by Feb 2027"), a living preview of the feature the person came for (photo scan,
 * coach chat or the workout week, from `source`), then three outcome lines with that feature first.
 * Plain theme surface (no dark gradient), so it reads calm in light and dark.
 */
export function PaywallHero({ source }: { source: PaywallSource }) {
  const c = useColors();
  const styles = useStyles();
  const goal = useQuery(planQuery).data?.goal;
  const focus = focusOf(source);
  const headline = goal?.targetWeightKg
    ? `Reach ${goal.targetWeightKg.toFixed(0)} kg by ${monthYear(goal.targetDate)}`
    : goal
      ? `${GOAL_LABEL[goal.type]}, faster`
      : "Reach your goal, faster";
  const order: Focus[] = [focus, ...(["photo", "coach", "workouts"] as Focus[]).filter((f) => f !== focus)];

  return (
    <Animated.View entering={appear} style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title" accessibilityRole="header">
          {headline}
        </Text>
        <Text variant="labelMedium" color={c.ink2}>
          with FITR8 Premium
        </Text>
      </View>

      <View style={styles.preview}>
        <Text variant="labelStrong">{PREVIEW_TITLE[focus]}</Text>
        {focus === "photo" ? <PhotoDemo /> : focus === "coach" ? <CoachDemo /> : <WeekPreview />}
      </View>

      <View style={{ gap: 10 }}>
        {order.map((f) => {
          const { icon: Icon, text } = OUTCOMES[f];
          return (
            <View key={f} style={styles.outcome}>
              <View style={styles.tick}>
                <Icon size={16} color={c.brandText} strokeWidth={2.2} />
              </View>
              <Text variant="bodyStrong">{text}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  preview: { gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  outcome: { flexDirection: "row", alignItems: "center", gap: 12 },
  tick: {
    width: 32,
    height: 32,
    borderRadius: radius.tile,
    backgroundColor: c.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
}));
