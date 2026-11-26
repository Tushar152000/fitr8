import { useQuery } from "@tanstack/react-query";
import type { CoachMemoryView } from "@fitr8/contracts";
import { Brain } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { MemoryList } from "@/components/coach/memory-list";
import { QueryError } from "@/components/query-error";
import { ListSkeleton } from "@/components/skeletons";
import { FieldError, IconTile, PageHeader, Screen, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { queryClient } from "@/lib/query";
import { coachMemoriesQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/** What the coach remembers about the user across chats. Each fact can be deleted. */
export default function CoachMemoryScreen() {
  const c = useColors();
  const styles = useStyles();
  const list = useQuery(coachMemoriesQuery);
  const pull = usePullRefresh(() => list.refetch());
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function forget(m: CoachMemoryView) {
    const ok = await confirmAction("Forget this?", m.text, "Forget");
    if (!ok) return;
    setRemoving(m.id);
    setError(null);
    try {
      await api(`/api/coach/memories/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      queryClient.setQueryData<CoachMemoryView[]>(coachMemoriesQuery.queryKey, (old) =>
        old?.filter((x) => x.id !== m.id),
      );
    } catch {
      setError("Couldn't forget that. Check your connection and try again.");
    } finally {
      setRemoving(null);
    }
  }

  const memories = list.data ?? [];
  return (
    <Screen refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <View style={{ gap: 12 }}>
        <PageHeader eyebrow="Your coach" title="What your coach remembers" />
        <Text variant="bodySm" color={c.ink2}>
          Facts you shared in chats, like injuries, foods you avoid or your schedule, so you don&apos;t have to repeat
          them. Tell the coach to forget something, or delete it here.
        </Text>
      </View>

      {error && <FieldError>{error}</FieldError>}
      {list.isPending ? (
        <ListSkeleton rows={3} />
      ) : list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : memories.length === 0 ? (
        <View style={styles.empty}>
          <IconTile icon={Brain} accent />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading3">Nothing saved yet</Text>
            <Text variant="labelRegular" color={c.ink2}>
              When you mention something lasting, like a knee injury or that you don&apos;t eat eggs, your coach keeps
              it here.
            </Text>
          </View>
        </View>
      ) : (
        <MemoryList memories={memories} removing={removing} onForget={forget} />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  // Empty state in the v2 card: accent tile, Heading/H3, a Label/Regular line.
  empty: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
}));
