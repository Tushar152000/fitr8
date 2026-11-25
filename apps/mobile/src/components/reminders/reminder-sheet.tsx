import type { ReminderListDto, ReminderRuleDto } from "@fitr8/contracts";
import { BellRing, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Button, FieldError, FormField, Text, TextField } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, ApiError, errorMessage } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { handlePremiumError } from "@/lib/premium";
import { queryClient } from "@/lib/query";
import { remindersQuery } from "@/lib/queries";
import { ensureNotificationPermission } from "@/lib/reminders";
import { describe, toCron, type WeeklySchedule } from "@/lib/reminder-format";
import { fonts, makeStyles, radius, useColors } from "@/lib/theme";
import { ScheduleFields } from "./schedule-fields";

/** What the sheet edits: a fresh draft from words (no id) or a saved reminder. */
export interface ReminderDraft {
  /** New for every opening, so the form starts fresh even for the same words. */
  nonce: number;
  id?: string;
  title: string;
  description: string;
  rules: ReminderRuleDto[];
  prompt?: string;
}

/** Review a draft from words, or edit a saved reminder: title, line, days and time. */
export function ReminderSheet({
  draft,
  onClose,
  onSaved,
}: {
  draft: ReminderDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Keep the last draft while the sheet slides away, so it doesn't empty mid-animation.
  const [shown, setShown] = useState(draft);
  if (draft && draft !== shown) setShown(draft);
  return (
    <Sheet open={draft !== null} onClose={onClose} title={shown?.id ? "Edit reminder" : "Check your reminder"}>
      {shown && <ReminderForm key={shown.nonce} draft={shown} onSaved={onSaved} />}
    </Sheet>
  );
}

function ReminderForm({ draft, onSaved }: { draft: ReminderDraft; onSaved: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  // One days-of-the-week rule is edited with the day toggles and time stepper; anything richer
  // (monthly dates, the last day, several rules) is shown as written and changed by describing it again.
  const initialWeekly = draft.rules.length === 1 ? draft.rules[0]!.weekly : null;
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(initialWeekly);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(draft.id);

  function toggleDay(day: number) {
    setError(null);
    setSchedule((s) => {
      if (!s) return s;
      const has = s.weekdays.includes(day);
      const weekdays = has ? s.weekdays.filter((d) => d !== day) : [...s.weekdays, day].sort((a, b) => a - b);
      return { ...s, weekdays };
    });
  }

  /** ±15 minutes, wrapping round midnight. Only for a once-a-day time. */
  function shift(minutes: number) {
    setSchedule((s) => {
      if (!s) return s;
      const total = (((s.hours[0]! * 60 + s.minute + minutes) % 1440) + 1440) % 1440;
      return { ...s, hours: [Math.floor(total / 60)], minute: total % 60 };
    });
  }

  async function save() {
    if (!title.trim()) return setError("Give it a title.");
    if (schedule && !schedule.weekdays.length) return setError("Pick at least one day.");
    setBusy(true);
    setError(null);
    try {
      // Ask the first time a reminder is saved: that's when the reason is obvious.
      await ensureNotificationPermission().catch(() => false);
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        crons: schedule ? [toCron(schedule)] : draft.rules.map((r) => r.cron),
      };
      if (draft.id) {
        await api(`/api/reminders/${draft.id}`, { method: "PATCH", json: body });
      } else {
        await api("/api/reminders", { json: { ...body, prompt: draft.prompt ?? null } });
        const changed = schedule !== null && initialWeekly !== null && toCron(schedule) !== toCron(initialWeekly);
        track("reminder_created", { from: changed ? "edited" : "words" });
      }
      await queryClient.invalidateQueries({ queryKey: remindersQuery.queryKey });
      onSaved();
    } catch (e) {
      if (handlePremiumError(e)) return onSaved();
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft.id) return;
    if (!(await confirmAction(`Delete "${draft.title}"?`, "You won't get this reminder any more.", "Delete"))) return;
    try {
      const id = draft.id;
      await api(`/api/reminders/${id}`, { method: "DELETE" });
      // Drop it from the list now and close; the refetch runs behind the closing sheet.
      queryClient.setQueryData(remindersQuery.queryKey, (old: ReminderListDto | undefined) =>
        old ? { ...old, reminders: old.reminders.filter((x) => x.id !== id) } : old,
      );
      void queryClient.invalidateQueries({ queryKey: remindersQuery.queryKey });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, "Couldn't delete. Try again."));
    }
  }

  return (
    <>
      <View style={styles.summary} accessibilityLiveRegion="polite">
        <BellRing size={18} color={c.brandText} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          {schedule ? (
            <Text weight={600} color={c.brandText}>
              {describe(schedule)}
            </Text>
          ) : (
            draft.rules.map((r) => (
              <Text key={r.cron} weight={600} color={c.brandText}>
                {draft.rules.length > 1 ? `• ${r.summary}` : r.summary}
              </Text>
            ))
          )}
        </View>
      </View>

      <FormField label="Title" gap={8}>
        <TextField
          accessibilityLabel="Title"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setError(null);
          }}
          maxLength={60}
          style={styles.input}
        />
      </FormField>
      <FormField label="Note (optional)" gap={8}>
        <TextField
          accessibilityLabel="Note"
          value={description}
          onChangeText={setDescription}
          maxLength={200}
          placeholder="Shown under the title"
          style={styles.input}
        />
      </FormField>

      {schedule ? (
        <ScheduleFields schedule={schedule} onToggleDay={toggleDay} onShift={shift} />
      ) : (
        <Text size={13} color={c.ink3}>
          {draft.rules.some((r) => !r.repeating)
            ? "Dates that move (like the second-last day) are planned a few ahead and topped up each time you open FITR8. "
            : ""}
          To change the days or times, describe the reminder again.
        </Text>
      )}

      {error && <FieldError>{error}</FieldError>}
      <Button onPress={save} loading={busy}>
        {editing ? "Save changes" : "Set reminder"}
      </Button>
      {editing && (
        <Button variant="secondary" icon={Trash2} onPress={remove}>
          Delete reminder
        </Button>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  summary: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: radius.input,
    backgroundColor: c.sunken,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  // TextField with the reminder sheet's semibold text.
  input: { fontFamily: fonts.sans600 },
}));
