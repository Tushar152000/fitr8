import type { HealthSummaryDto } from "@fitr8/contracts";
import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";
import { weekdayLetter } from "@/lib/training";
import { HealthMetrics, sleepText } from "./metrics";

/** The Health apps screen's numbers: the six tiles, then why recovery is what it is, last night and steps. */
export function HealthDetails({ s }: { s: HealthSummaryDto }) {
  return (
    <>
      <HealthMetrics s={s} />
      {s.recovery && <RecoveryCard recovery={s.recovery} />}
      {s.sleep && <SleepCard sleep={s.sleep} />}
      {s.steps && <StepsWeekCard steps={s.steps} />}
    </>
  );
}

function RecoveryCard({ recovery }: { recovery: NonNullable<HealthSummaryDto["recovery"]> }) {
  const c = useColors();
  return (
    <Card>
      <Text weight={700}>Why your recovery is {recovery.score}</Text>
      {recovery.reasons.map((r) => (
        <Text key={r} size={14} color={c.ink2}>
          • {r}
        </Text>
      ))}
      <Text size={12} color={c.ink3}>
        An estimate from sleep, resting heart rate and heart-rate variability against your own usual. Not medical
        advice.
      </Text>
    </Card>
  );
}

function SleepCard({ sleep }: { sleep: NonNullable<HealthSummaryDto["sleep"]> }) {
  const c = useColors();
  return (
    <Card>
      <Text weight={700}>Last night</Text>
      <Text size={14} color={c.ink2} tabular>
        {sleepText(sleep.asleepMinutes)} asleep of {sleepText(sleep.inBedMinutes)} in bed
      </Text>
      {(sleep.deepMinutes > 0 || sleep.remMinutes > 0) && (
        <Text size={14} color={c.ink2} tabular>
          Deep {sleepText(sleep.deepMinutes)} · REM {sleepText(sleep.remMinutes)} · Light{" "}
          {sleepText(sleep.lightMinutes)}
        </Text>
      )}
    </Card>
  );
}

/** Daily steps this week as small bars; days at the goal are green. */
function StepsWeekCard({ steps }: { steps: NonNullable<HealthSummaryDto["steps"]> }) {
  const c = useColors();
  const max = Math.max(steps.goal, ...steps.week.map((w) => w.count ?? 0));
  return (
    <Card>
      <Text weight={700}>Steps this week</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 }}>
        {steps.week.map((d) => (
          <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View
              accessibilityLabel={`${d.date}: ${d.count ?? "no"} steps`}
              style={{
                width: "70%",
                height: Math.max(2, ((d.count ?? 0) / max) * 60),
                borderRadius: 4,
                backgroundColor: (d.count ?? 0) >= steps.goal ? c.protein : c.lineStrong,
              }}
            />
            <Text size={10} color={c.ink3}>
              {weekdayLetter(d.date)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
