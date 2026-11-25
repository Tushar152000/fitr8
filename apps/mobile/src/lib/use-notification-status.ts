import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { notificationStatus } from "@/lib/reminders";

export type NotificationStatus = Awaited<ReturnType<typeof notificationStatus>>;

/** Notification permission, re-read when the app comes back (e.g. from Settings). */
export function useNotificationStatus() {
  const [value, setValue] = useState<NotificationStatus | null>(null);
  const refresh = useCallback(() => {
    notificationStatus()
      .then(setValue)
      .catch(() => setValue("unavailable"));
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [refresh]);
  return { value, refresh };
}
