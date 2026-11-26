import { useSyncExternalStore } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Yes/no question in the app's own dialog (components/confirm-dialog.tsx, rendered once in the root
 * layout), never the system alert or the browser's confirm (user decision 2026-11-27: one design
 * everywhere). `action` labels the red button. Resolves true when it's pressed, false on Cancel or
 * a tap outside. A newer question replaces an open one (which resolves false).
 */
export type ConfirmRequest = { id: number; title: string; message: string; action: string };

let current: (ConfirmRequest & { resolve: (ok: boolean) => void }) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirmAction(title: string, message: string, action: string): Promise<boolean> {
  haptic.warning();
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { id: Date.now(), title, message, action, resolve };
    emit();
  });
}

/** Answers the open question (the dialog's buttons). */
export function answerConfirm(ok: boolean) {
  const open = current;
  if (!open) return;
  current = null;
  emit();
  open.resolve(ok);
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
