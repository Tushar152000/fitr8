import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { PressableScale, Text } from "@/components/ui";
import { longDate } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { contentIn } from "@/lib/motion";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { PlanDto } from "@fitr8/contracts";

const GOAL_LABEL = { FAT_LOSS: "Lose fat", MUSCLE_GAIN: "Build muscle", RECOMPOSITION: "Recomposition" } as const;

function goalLine(goal: PlanDto["goal"] | undefined) {
  if (!goal) return "No active goal";
  if (goal.targetBodyFatPct != null) return `${goal.targetBodyFatPct}% body fat by ${longDate(goal.targetDate)}`;
  if (goal.targetWeightKg != null) return `${goal.targetWeightKg} kg by ${longDate(goal.targetDate)}`;
  return `Hold weight, improve shape by ${longDate(goal.targetDate)}`;
}

/** Screen 13 dark goal card: the goal, its target line, Edit (back into onboarding) and the daily targets. */
export function GoalCard({
  goal,
  target,
}: {
  goal: PlanDto["goal"] | undefined;
  target: PlanDto["summary"]["target"] | undefined;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Animated.View entering={contentIn} style={styles.goal} accessibilityLabel="Current goal">
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text weight={600} size={13} color="rgba(255,255,255,0.7)">
            Current goal
          </Text>
          <Text variant="h1" size={24} color={c.white}>
            {goal ? GOAL_LABEL[goal.type] : "—"}
          </Text>
          <Text size={13} color="rgba(255,255,255,0.75)">
            {goalLine(goal)}
          </Text>
        </View>
        <PressableScale accessibilityRole="button" onPress={() => router.push("/onboarding")} style={styles.edit}>
          <Pencil size={16} color={c.white} />
          <Text weight={600} size={13} color={c.white}>
            Edit
          </Text>
        </PressableScale>
      </View>
      {target && (
        <View style={styles.goalFoot}>
          <Text size={13} color="rgba(255,255,255,0.75)" tabular>
            <Text weight={700} size={13} color={c.white}>
              {formatInt(target.kcal)} kcal
            </Text>{" "}
            a day · {target.proteinG} g protein · {target.carbsG} g carbs · {target.fatG} g fat
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  goal: {
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.panelLine,
    padding: 20,
  },
  edit: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
  },
  goalFoot: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: 12 },
}));
