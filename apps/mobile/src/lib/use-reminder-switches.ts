import type { RemindersDto } from "@fitr8/contracts";
import type { Day } from "./types";
import { useState } from "react";
import { api } from "./api";
import { useAuth, useMe } from "./auth";
import { localYmd } from "./meal-param";
import { loggedToday } from "./meal-reminder-plan";
import { dayQuery, waterQuery } from "./queries";
import { queryClient } from "./query";
import {
  ensureNotificationPermission,
  remindersAvailable,
  sendReminderConfirmation,
  syncRoutineReminders,
  syncWaterReminders,
} from "./reminders";

export type SwitchKey = "meals" | "water" | "weighIn";
type Switches = Record<SwitchKey, boolean>;

/**
 * The Reminders screen's three built-in switches (PATCH /api/profile/reminders). Optimistic: the
 * switch moves at once; turning one on asks for notification permission first (the choice is saved
 * either way, the permission note explains why nothing rings). Then the phone's schedule follows.
 */
export function useReminderSwitches() {
  const { refresh } = useAuth();
  const p = useMe().profile;
  const [state, setState] = useState<Switches>({
    meals: p?.remindMeals ?? false,
    water: p?.remindWater ?? false,
    weighIn: p?.remindWeighIn ?? false,
  });
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: SwitchKey, value: boolean) {
    setError(null);
    setState((s) => ({ ...s, [key]: value }));
    if (value && remindersAvailable) await ensureNotificationPermission().catch(() => false);
    let now: Switches;
    try {
      const saved = await api<RemindersDto>("/api/profile/reminders", { method: "PATCH", json: { [key]: value } });
      now = { meals: saved.remindMeals, water: saved.remindWater, weighIn: saved.remindWeighIn };
    } catch {
      setState((s) => ({ ...s, [key]: !value }));
      setError("Couldn't save that change. Try again.");
      return;
    }
    setState(now);
    refresh().catch(() => {}); // /api/me carries the switches (Profile summary, launch re-plan)
    // The phone's schedule; a failure here leaves the saved choice, launch re-plans it.
    try {
      if (key === "water") {
        const day = await queryClient.fetchQuery({ ...waterQuery, staleTime: 0 });
        const at = await syncWaterReminders({ enabled: now.water, leftMl: day.targetMl - day.consumedMl });
        if (value && at) await sendReminderConfirmation(at);
      } else {
        const day = queryClient.getQueryData<Day>(dayQuery.queryKey);
        await syncRoutineReminders({
          meals: now.meals,
          weighIn: now.weighIn,
          loggedToday: loggedToday(day, localYmd()),
        });
      }
    } catch {
      // nothing to show: the switch is saved
    }
  }

  return { state, toggle, error };
}
