import type { ProgressDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Calendar } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ProfilePage } from "@/components/profile/profile-page";
import { ProgressStat } from "@/components/progress/progress-stat";
import { WeeklyTrendCard } from "@/components/progress/weekly-trend-card";
import { WeighInSheet, type WeighIn } from "@/components/progress/weigh-in-sheet";
import { QueryError } from "@/components/query-error";
import { FadeIn, MenuGroup, MenuRow, PillButton, SectionLabel, Skeleton, Text } from "@/components/ui";
import { dayMonth } from "@/lib/goal-details";
import { checkinRows, progressTiles, weekLabel } from "@/lib/progress-stats";
import { progressQuery } from "@/lib/queries";
import { useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * Figma frame 10 "Profile / Progress": weight, on-target days and best streak, the 8-week weight
 * trend, then each week's check-in (latest weigh-in of the week; tap to edit or delete it). Opened
 * from Profile and Home's weight card. "Add weigh-in" opens Measurements' add sheet on weight.
 */
export default function ProgressScreen() {
  const progress = useQuery(progressQuery);
  const pull = usePullRefresh(() => progress.refetch());

  return (
    <ProfilePage title="Progress" refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      {progress.isError ? (
        <QueryError error={progress.error} onRetry={() => progress.refetch()} />
      ) : progress.isPending ? (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Skeleton height={86} />
              </View>
            ))}
          </View>
          <Skeleton height={236} />
          <Skeleton height={200} />
        </>
      ) : (
        <FadeIn style={{ gap: 24 }}>
          <ProgressBody p={progress.data} />
        </FadeIn>
      )}
    </ProfilePage>
  );
}

function ProgressBody({ p }: { p: ProgressDto }) {
  const c = useColors();
  const rows = checkinRows(p.weeks);
  const [editing, setEditing] = useState<WeighIn | null>(null);
  return (
    <>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {progressTiles(p).map((t) => (
          <ProgressStat key={t.label} {...t} />
        ))}
      </View>
      <WeeklyTrendCard weeks={p.weeks} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionLabel>Weekly check-ins</SectionLabel>
          <PillButton
            label="Add weigh-in"
            variant="link"
            onPress={() => router.push("/measurements?add=weightKg")}
            style={{ paddingVertical: 4, paddingLeft: 12 }}
          />
        </View>
        {rows.length ? (
          <MenuGroup>
            {rows.map((w) => {
              const label = weekLabel(w.weeksAgo);
              return (
                <MenuRow
                  key={w.weekStart}
                  icon={Calendar}
                  title={label}
                  subtitle={dayMonth(w.date)}
                  value={`${w.weightKg.toFixed(1)} kg`}
                  accessibilityLabel={`${label}, ${dayMonth(w.date)}, ${w.weightKg.toFixed(1)} kg. Edit weigh-in`}
                  onPress={() => setEditing({ date: w.date, weightKg: w.weightKg, label })}
                />
              );
            })}
          </MenuGroup>
        ) : (
          <Text variant="bodySm" color={c.ink2}>
            No weigh-ins in the last 8 weeks.
          </Text>
        )}
      </View>
      <WeighInSheet weighIn={editing} onClose={() => setEditing(null)} />
    </>
  );
}
