import { REMINDER_SCHEDULE, type ReminderDraftDto, type ReminderDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, Calendar, Droplet, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { ProfilePage } from "@/components/profile/profile-page";
import { QueryError } from "@/components/query-error";
import { NewReminderCard } from "@/components/reminders/new-reminder-card";
import { PermissionNote } from "@/components/reminders/permission-note";
import { ReminderCard } from "@/components/reminders/reminder-card";
import { ReminderSheet, type ReminderDraft } from "@/components/reminders/reminder-sheet";
import { ListSkeleton } from "@/components/skeletons";
import { AnimatedRow, FieldError, MenuGroup, MenuRow, SectionLabel, Switch, Text } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import { queryClient } from "@/lib/query";
import { remindersQuery } from "@/lib/queries";
import { ensureNotificationPermission } from "@/lib/reminders";
import { useColors } from "@/lib/theme";
import { useNotificationStatus } from "@/lib/use-notification-status";
import { usePullRefresh } from "@/lib/use-pull-refresh";
import { useReminderSwitches, type SwitchKey } from "@/lib/use-reminder-switches";

/** "08:00" → "8:00". */
const clock = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");
const ISO_WEEKDAYS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/** Figma frame 12's three switches; times from contracts REMINDER_SCHEDULE. */
const SWITCHES: { key: SwitchKey; icon: LucideIcon; title: string; subtitle: string }[] = [
  { key: "meals", icon: Bell, title: "Meal reminders", subtitle: REMINDER_SCHEDULE.meals.map(clock).join(" · ") },
  {
    key: "water",
    icon: Droplet,
    title: "Water reminders",
    subtitle: `Every ${REMINDER_SCHEDULE.water.everyHours} hours`,
  },
  {
    key: "weighIn",
    icon: Calendar,
    title: "Weekly weigh-in",
    subtitle: `${ISO_WEEKDAYS[REMINDER_SCHEDULE.weighIn.weekday - 1]}, ${clock(REMINDER_SCHEDULE.weighIn.time)}`,
  },
];

/**
 * Profile / Reminders (Figma frame 12): the built-in meal, water and weekly weigh-in switches, then
 * the user's own reminders described in words (kept below the design's group). The server keeps the
 * choices; this phone schedules the notifications.
 */
export default function RemindersScreen() {
  const c = useColors();
  const list = useQuery(remindersQuery);
  const status = useNotificationStatus();
  const switches = useReminderSwitches();
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
    <ProfilePage
      title="Reminders"
      intro="Nudges at the right time help you log consistently."
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      <View style={{ gap: 10 }}>
        <MenuGroup>
          {SWITCHES.map((s) => (
            <MenuRow
              key={s.key}
              icon={s.icon}
              title={s.title}
              subtitle={s.subtitle}
              trailing={
                <Switch
                  checked={switches.state[s.key]}
                  onChange={(v) => {
                    switches.toggle(s.key, v).finally(status.refresh);
                  }}
                  label={s.title}
                />
              }
            />
          ))}
        </MenuGroup>
        {switches.error && <FieldError>{switches.error}</FieldError>}
      </View>

      <PermissionNote status={status.value} />

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionLabel>Custom reminders</SectionLabel>
          {isPremium ? (
            <PremiumBadge label="Unlimited" />
          ) : reminders.length > 0 ? (
            <Text variant="labelMedium" color={c.ink2} tabular>
              {reminders.length} of {max}
            </Text>
          ) : null}
        </View>
        {list.isPending ? (
          <ListSkeleton rows={2} />
        ) : list.isError ? (
          <QueryError error={list.error} onRetry={() => list.refetch()} />
        ) : reminders.length > 0 ? (
          <MenuGroup>
            {reminders.map((r) => (
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
            ))}
          </MenuGroup>
        ) : (
          <MenuGroup>
            <MenuRow icon={BellRing} title="Your own reminders" subtitle="Describe one below in your own words" />
          </MenuGroup>
        )}
        {listError && <FieldError>{listError}</FieldError>}
      </View>

      <View style={{ gap: 10 }}>
        <SectionLabel>New reminder</SectionLabel>
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
    </ProfilePage>
  );
}
