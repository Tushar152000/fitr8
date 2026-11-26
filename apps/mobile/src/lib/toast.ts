import { useSyncExternalStore } from "react";
import { haptic } from "@/lib/haptics";

/** One short message at a time ("Welcome to Premium"), shown by <Toast /> in the root layout. */
type ToastState = { id: number; message: string } | null;

let state: ToastState = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function set(next: ToastState) {
  state = next;
  for (const l of listeners) l();
}

/** A toast confirms something done, so it taps "success"; pass `quiet` for neutral or failure notes. */
export function showToast(message: string, ms = 3000, quiet = false) {
  if (!quiet) haptic.success();
  if (timer) clearTimeout(timer);
  set({ id: Date.now(), message });
  timer = setTimeout(() => set(null), ms);
}

export function useToast(): ToastState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
