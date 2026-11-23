import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useMe } from "../auth";
import { healthStatusQuery } from "../queries";
import { queryClient } from "../query";
import { healthAdapter } from "./index";
import { syncHealth } from "./sync";

/**
 * While the app is open: syncs Apple Health / Health Connect at launch and whenever the app comes
 * back to the foreground (at most every 15 minutes), if this phone's platform is connected.
 * Failures stay quiet: the next foreground retries.
 */
export function useHealthSync() {
  const me = useMe();
  const adapter = healthAdapter();
  const status = useQuery({ ...healthStatusQuery, enabled: adapter != null, staleTime: 10 * 60_000 });
  const connected = Boolean(adapter && status.data?.connections.some((c) => c.platform === adapter.platform));

  useEffect(() => {
    if (!connected) return;
    const go = () =>
      syncHealth(me.id)
        .then((r) => {
          if (r) void queryClient.invalidateQueries({ queryKey: ["health"] });
        })
        .catch(() => {});
    go();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") go();
    });
    return () => sub.remove();
  }, [connected, me.id]);
}
