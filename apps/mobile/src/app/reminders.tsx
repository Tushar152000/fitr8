import { useQuery } from "@tanstack/react-query";
import type { ReminderDraftDto, ReminderDto } from "@fitr8/contracts";
import { BellRing } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { QueryError } from "@/components/query-error";
import { NewReminderCard } from "@/components/reminders/new-reminder-card";
import { PermissionNote } from "@/components/reminders/permission-note";
import { ReminderCard } from "@/components/reminders/reminder-card";
import { ReminderSheet, type ReminderDraft } from "@/components/reminders/reminder-sheet";
import { ListSkeleton } from "@/components/skeletons";
import { AnimatedRow, Card, FieldError, Screen, Text } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import { queryClient } from "@/lib/query";
import { remindersQuery } from "@/lib/queries";
import { ensureNotificationPermission } from "@/lib/reminders";
import { makeStyles, useColors } from "@/lib/theme";
import { useNotificationStatus } from "@/lib/use-notification-status";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/** Reminders you describe in words. The server keeps the list; this phone schedules the alerts. */
export default function RemindersScreen() {
  const c = useColors();
  const styles = useStyles();
  const list = useQuery(remindersQuery);
  const status = useNotificationStatus();
  const pull = usePullRefresh(() => {
    status.refresh();
    return list.refetch();
  });
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReminderDraft | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const reminders = list.data?.reminders ?? [];
  const max = list.data?.max ?? 20;
  const full = reminders.length >= max;
  // Free plan at its 3 reminders: more is a Premium feature, not a hard wall.
  const { locked, isPremium } = usePremium();
  const upgradeForMore = locked("reminders", reminders.length);

  async function create() {
    const value = text.trim();
    setParseError(null);
    if (value.length < 3) return setParseError("Tell us what to remind you about, and when.");
    setParsing(true);
    try {
      const d = await api<ReminderDraftDto>("/api/reminders/parse", { json: { text: value } });
      setDraft({
        nonce: Date.now(),
        title: d.title,
        description: d.description ?? "",
        rules: d.rules,
        prompt: value,
      });
    } catch (e) {
      setParseError(e instanceof ApiError ? e.message : "Couldn't set that up. Try again.");
    } finally {
      setParsing(false);
    }
  }

  async function toggle(r: ReminderDto, enabled: boolean) {
    setListError(null);
    setToggling(r.id);
    // Optimistic: the switch moves at once (before the permission prompt), the phone reschedules
    // when the list refreshes.
    queryClient.setQueryData(remindersQuery.queryKey, (old: typeof list.data) =>
      old ? { ...old, reminders: old.reminders.map((x) => (x.id === r.id ? { ...x, enabled } : x)) } : old,
    );
    if (enabled) await ensureNotificationPermission().catch(() => false);
    try {
      await api(`/api/reminders/${r.id}`, { method: "PATCH", json: { enabled } });
    } catch {
      setListError("Couldn't save that change. Try again.");
    } finally {
      setToggling(null);
      queryClient.invalidateQueries({ queryKey: remindersQuery.queryKey });
    }
  }

  return (
    <Screen refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <BackHeader />
      <View style={{ gap: 6 }}>
        <Text variant="h1">Reminders</Text>
        <Text color={c.ink2}>Say what and when, in your own words. Your phone does the reminding.</Text>
      </View>

      <PermissionNote status={status.value} />

      <NewReminderCard
        text={text}
        onChangeText={(v) => {
          setText(v);
          setParseError(null);
        }}
        onPickExample={setText}
        error={parseError}
        max={max}
        full={full}
        upgradeForMore={upgradeForMore}
        parsing={parsing}
        onCreate={create}
      />

      <View style={{ gap: 8 }}>
        <View style={styles.sectionHead}>
          <Text variant="h2">Your reminders</Text>
          {isPremium ? (
            <PremiumBadge label="Unlimited" />
          ) : (
            reminders.length > 0 && (
              <Text size={13} color={c.ink3} tabular>
                {reminders.length} of {max}
              </Text>
            )
          )}
        </View>
        {list.isPending ? (
          <ListSkeleton rows={3} />
        ) : list.isError ? (
          <QueryError error={list.error} onRetry={() => list.refetch()} />
        ) : reminders.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
            <BellRing size={28} color={c.ink3} />
            <Text weight={600} center>
              No reminders yet
            </Text>
            <Text size={13} color={c.ink3} center>
              Creatine, water, a walk after dinner, Monday weigh-ins — describe one above.
            </Text>
          </Card>
        ) : (
          reminders.map((r) => (
            <AnimatedRow key={r.id}>
              <ReminderCard
                reminder={r}
                busy={toggling === r.id}
                onToggle={(v) => toggle(r, v)}
                onOpen={() =>
                  setDraft({
                    nonce: Date.now(),
                    id: r.id,
                    title: r.title,
                    description: r.description ?? "",
                    rules: r.rules,
                  })
                }
              />
            </AnimatedRow>
          ))
        )}
        {listError && <FieldError>{listError}</FieldError>}
      </View>

      <ReminderSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          setText("");
          status.refresh();
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
}));
