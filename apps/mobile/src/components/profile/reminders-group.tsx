import { router } from "expo-router";
import { BellRing } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ListCard, Text } from "@/components/ui";
import { LinkRow, RowError, SwitchRow } from "./rows";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mealTitle } from "@/lib/format";
import { waterQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import {
  ensureNotificationPermission,
  remindersAvailable,
  sendReminderConfirmation,
  syncWaterReminders,
} from "@/lib/reminders";
import { useColors } from "@/lib/theme";

type ReminderKey = "lunch" | "dinner" | "water";

const SWITCHES = [
  ["water", "Water reminders", "Every 2 hours, 9 am–9 pm, until you hit today's target"],
  ["lunch", "Lunch reminder", "2 pm, if lunch isn't logged"],
  ["dinner", "Dinner reminder", "9 pm, if dinner isn't logged"],
] as const;

const nextWaterLabel = (d: Date) => {
  const today = new Date().toDateString() === d.toDateString();
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
  return today ? `today, ${time}` : `${new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(d)}, ${time}`;
};

/**
 * Design 13 "Reminders": a link to the user's own reminders (their titles, or an example when there
 * are none), then the water / lunch / dinner switches.
 */
export function RemindersGroup({
  titles,
  lunch,
  dinner,
  water,
}: {
  titles: string[];
  lunch: boolean;
  dinner: boolean;
  water: boolean;
}) {
  const c = useColors();
  return (
    <ListCard title="Reminders">
      <LinkRow
        label="My reminders"
        sub={titles.length ? mealTitle(titles, "") : "Describe one in words: “stretch at 7 pm on weekdays”"}
        icon={<BellRing size={20} color={c.brandText} />}
        onPress={() => router.push("/reminders")}
      />
      <ReminderSwitches lunch={lunch} dinner={dinner} water={water} />
    </ListCard>
  );
}

/** Design 13 reminder switches, saved as you toggle. */
function ReminderSwitches({ lunch, dinner, water }: Record<ReminderKey, boolean>) {
  const c = useColors();
  const { refresh } = useAuth();
  const [state, setState] = useState({ lunch, dinner, water });
  const [error, setError] = useState<string | null>(null);
  const [nextWater, setNextWater] = useState<Date | null>(null);

  // Show when the next water reminder is due (also re-schedules them from today's progress).
  useEffect(() => {
    if (!state.water) return; // the line is hidden while off
    queryClient
      .fetchQuery(waterQuery)
      .then((day) => syncWaterReminders({ enabled: true, leftMl: day.targetMl - day.consumedMl }))
      .then(setNextWater)
      .catch(() => {});
  }, [state.water]);

  async function toggle(key: ReminderKey, value: boolean) {
    setError(null);
    if (key === "water" && value && !remindersAvailable) {
      // Save the choice anyway: it takes effect in the installed app.
      setError("Water reminders need the installed app. Expo Go on Android can't show them.");
    } else if (key === "water" && value && !(await ensureNotificationPermission())) {
      setError("Allow notifications for FITR8 in your phone's Settings to get water reminders.");
      return;
    }
    setState((s) => ({ ...s, [key]: value }));
    try {
      await api("/api/profile/reminders", { method: "PATCH", json: { [key]: value } });
      refresh().catch(() => {}); // so the switch shows the saved value next time
      if (key === "water") {
        // Schedules (or clears) the phone's reminders from today's progress.
        const day = await queryClient.fetchQuery({ ...waterQuery, staleTime: 0 });
        const next = await syncWaterReminders({ enabled: value, leftMl: day.targetMl - day.consumedMl });
        setNextWater(next);
        if (value) await sendReminderConfirmation(next);
      }
    } catch {
      setState((s) => ({ ...s, [key]: !value }));
      setError("Couldn't save. Try again.");
    }
  }

  return (
    <>
      {SWITCHES.map(([key, label, sub]) => (
        <SwitchRow key={key} label={label} sub={sub} checked={state[key]} onChange={(v) => toggle(key, v)}>
          {key === "water" && state.water && nextWater && (
            <Text weight={600} size={13} color={c.water}>
              Next reminder: {nextWaterLabel(nextWater)}
            </Text>
          )}
        </SwitchRow>
      ))}
      {error && <RowError>{error}</RowError>}
    </>
  );
}
