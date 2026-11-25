import type { HistoryDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { DailyBars } from "@/components/log/history/daily-bars";
import { HistoryDay } from "@/components/log/history/history-day";
import { HistoryTiles } from "@/components/log/history/history-tiles";
import { QueryError } from "@/components/query-error";
import { HistorySkeleton } from "@/components/skeletons";
import { Card, FadeIn, Screen, Segmented, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/** Screen 12 "Past logs": 7/30-day intake history with a tappable day list. */
export default function HistoryScreen() {
  const c = useColors();
  const [range, setRange] = useState<7 | 30>(7);
  const [picked, setPicked] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ["history", range],
    queryFn: () => api<HistoryDto>(`/api/history?days=${range}`),
  });
  const pull = usePullRefresh(() => history.refetch());
  const h = history.data;
  const selected = h ? (h.days.find((d) => d.date === picked) ?? h.days[h.days.length - 1]) : null;

  return (
    <Screen refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <BackHeader />
      <View>
        <Text variant="meta">Meal history</Text>
        <Text variant="h1">Past logs</Text>
      </View>
      <Segmented
        label="Range"
        value={range}
        onChange={(v) => {
          setRange(v);
          setPicked(null);
        }}
        options={[
          { value: 7, label: "7 days" },
          { value: 30, label: "30 days" },
        ]}
      />
      {history.isPending ? (
        <HistorySkeleton />
      ) : history.isError ? (
        <QueryError error={history.error} onRetry={() => history.refetch()} />
      ) : !h || !selected ? (
        <Card>
          <Text color={c.ink3}>Nothing logged yet.</Text>
        </Card>
      ) : (
        <FadeIn style={{ gap: 24 }}>
          <HistoryTiles history={h} range={range} />

          <DailyBars days={h.days} range={range} selected={selected.date} onSelect={setPicked} />

          <HistoryDay day={selected} />
        </FadeIn>
      )}
    </Screen>
  );
}
