import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { waterQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { syncWaterReminders } from "@/lib/reminders";
import type { WaterDay } from "@/lib/types";

const KEY = waterQuery.queryKey;
const MUTATION_KEY = ["water", "change"];
/** Glasses added on the phone that the server hasn't confirmed yet. */
const PENDING = "pending-";

const settle = () => {
  // Refetch once the last of a burst of taps lands, so in-between answers don't flicker the glasses.
  if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) === 1) {
    return queryClient.invalidateQueries({ queryKey: KEY });
  }
};

async function snapshot() {
  await queryClient.cancelQueries({ queryKey: KEY });
  return queryClient.getQueryData<WaterDay>(KEY);
}

/**
 * Today's water plus add / undo. Both are optimistic: the glass fills (or drains) on the tap, rolls
 * back if the server says no, and the day is refetched when the taps settle. Also keeps the phone's
 * water reminders in step with progress.
 */
export function useWater() {
  const water = useQuery(waterQuery);

  const add = useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: (ml: number) => api<WaterDay>("/api/water", { json: { ml } }),
    onMutate: async (ml) => {
      const before = await snapshot();
      // A glass lands with a light tap; the one that reaches the target gets "success".
      if (before && before.consumedMl < before.targetMl && before.consumedMl + ml >= before.targetMl) haptic.success();
      else haptic.tap();
      if (before) {
        const log = { id: `${PENDING}${Date.now()}`, ml, createdAt: new Date().toISOString() };
        queryClient.setQueryData<WaterDay>(KEY, {
          ...before,
          consumedMl: before.consumedMl + ml,
          logs: [...before.logs, log],
        });
      }
      return { before };
    },
    onError: (_e, _ml, ctx) => {
      haptic.error();
      if (ctx?.before) queryClient.setQueryData(KEY, ctx.before);
    },
    onSettled: settle,
  });

  const undo = useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: (id: string) => api(`/api/water/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      haptic.soft();
      const before = await snapshot();
      if (before) {
        const gone = before.logs.find((l) => l.id === id);
        queryClient.setQueryData<WaterDay>(KEY, {
          ...before,
          consumedMl: before.consumedMl - (gone?.ml ?? 0),
          logs: before.logs.filter((l) => l.id !== id),
        });
      }
      return { before };
    },
    onError: (_e, _id, ctx) => {
      haptic.error();
      if (ctx?.before) queryClient.setQueryData(KEY, ctx.before);
    },
    onSettled: settle,
  });

  // No reminders left today once the target is reached.
  const d = water.data;
  useEffect(() => {
    if (d) syncWaterReminders({ enabled: d.remind, leftMl: d.targetMl - d.consumedMl }).catch(() => {});
  }, [d]);

  /** The last glass can be taken back once the server has it (a pending one has no id yet). */
  const lastLog = d?.logs.at(-1);
  const undoable = lastLog && !lastLog.id.startsWith(PENDING) ? lastLog : undefined;

  return { water, add, undo, undoable };
}
