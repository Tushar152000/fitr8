import type { PlanDto, ProgressDto } from "@fitr8/contracts";
import { Target } from "lucide-react-native";
import { View } from "react-native";
import { IconTile, ProgressFill, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { goalProgress, monthYear } from "@/lib/goal-details";
import { GOAL_LABEL } from "@/lib/profile-summary";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Figma frame 9 "Goal card": accent target tile with the goal and "start → target · pace", the
 * progress bar from the start weight ("1.2 kg lost" / "3.8 kg to go"), then the daily kcal, protein
 * and the target month.
 */
export function GoalSummaryCard({ plan, progress }: { plan: PlanDto; progress: ProgressDto }) {
  const c = useColors();
  const styles = useStyles();
  const { line, bar } = goalProgress(plan, progress);
  const target = plan.summary.target;
  return (
    <View style={styles.card} accessibilityLabel="Current goal">
      <View style={styles.head}>
        <IconTile icon={Target} accent />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading3" numberOfLines={1}>
            {GOAL_LABEL[plan.goal.type]}
          </Text>
          <Text variant="labelRegular" color={c.ink2} numberOfLines={1} tabular>
            {line}
          </Text>
        </View>
      </View>
      {bar && (
        <View style={{ gap: 8 }} accessible accessibilityLabel={`${bar.done}, ${bar.left}`}>
          <ProgressFill
            fraction={bar.fraction}
            color={c.brand}
            trackStyle={styles.track}
            fillStyle={{ borderRadius: 100 }}
          />
          <View style={styles.between}>
            <Text variant="captionStrong" color={c.brandText} tabular>
              {bar.done}
            </Text>
            <Text variant="captionStrong" color={c.ink2} tabular>
              {bar.left}
            </Text>
          </View>
        </View>
      )}
      <View style={styles.targets}>
        <Figure value={formatInt(target.kcal)} label="kcal / day" />
        <Figure value={`${target.proteinG} g`} label="Protein" />
        <Figure value={monthYear(plan.goal.targetDate)} label="Target date" />
      </View>
    </View>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="bodyStrong" numberOfLines={1} tabular>
        {value}
      </Text>
      <Text variant="caption" color={c.ink2} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { gap: 16, padding: 16, borderRadius: radius.card, backgroundColor: c.surface },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  track: { height: 8, borderRadius: 100, backgroundColor: c.track, overflow: "hidden" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  targets: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.line, paddingTop: 14 },
}));
