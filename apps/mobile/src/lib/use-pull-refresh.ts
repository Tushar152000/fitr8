import { useState } from "react";

/**
 * Pull-to-refresh state that only spins for the user's own pull. Binding `refreshing` to a query's
 * `isRefetching` shows the spinner for every background refetch (focus, stale data), which reads as
 * the screen jumping for no reason.
 */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };
  return { refreshing, onRefresh };
}
