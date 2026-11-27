import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useSyncExternalStore } from "react";
import { cancelSessionNotices, scheduleSessionDone } from "./reminders";

/**
 * A timed session in progress (walk, run, ride, yoga timer on /training/[date]), kept on the phone so
 * leaving the screen or closing the app doesn't lose it (user report 2026-11-28: a paused long walk
 * was gone on return). Times are epoch ms: `startedAt`, total paused so far, and when the current
 * pause began (null while running). One per day and session type; cleared once logged.
 *
 * Also the one "active" session (what it is + its timing) for the live bar above the tab bar and
 * the notifications: reactive through `useActiveSession()`.
 */
export type SavedSession = { startedAt: number; pausedMs: number; pausedAt: number | null };
export type SessionMeta = { date: string; type: string; title: string; minutes: number };
export type ActiveSession = SessionMeta & SavedSession;

const key = (date: string, type: string) => `fitr8.session.${date}.${type}`;
const ACTIVE = "fitr8.session.active";

function read(k: string): string | null {
  try {
    return Platform.OS === "web" ? (globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItem(k);
  } catch {
    return null;
  }
}
function write(k: string, v: string) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(k, v);
    else SecureStore.setItem(k, v);
  } catch {
    // Not saved: the session still runs while the screen is open.
  }
}
function remove(k: string) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(k);
    else void SecureStore.deleteItemAsync(k);
  } catch {
    // Nothing to clear.
  }
}

/** The saved session for this day and type, or null (synchronous, for the first render). */
export function readSession(date: string, type: string): SavedSession | null {
  const raw = read(key(date, type));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SavedSession;
    return typeof s.startedAt === "number" && typeof s.pausedMs === "number" ? s : null;
  } catch {
    return null;
  }
}

// ── The active session (reactive) ──────────────────────────────────────────

let active: ActiveSession | null | undefined; // undefined = not read yet
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

function loadActive(): ActiveSession | null {
  if (active !== undefined) return active;
  const raw = read(ACTIVE);
  let meta: SessionMeta | null = null;
  try {
    meta = raw ? (JSON.parse(raw) as SessionMeta) : null;
  } catch {
    meta = null;
  }
  const saved = meta ? readSession(meta.date, meta.type) : null;
  active = meta && saved ? { ...meta, ...saved } : null;
  return active;
}

/** Start or update the session's timing; it becomes the active one. */
export function saveSession(meta: SessionMeta, s: SavedSession) {
  write(key(meta.date, meta.type), JSON.stringify(s));
  write(ACTIVE, JSON.stringify(meta));
  active = { ...meta, ...s };
  emit();
  // The "done" notification follows the timing: none while paused, re-timed on resume.
  void scheduleSessionDone(active).catch(() => {});
}

/** Logged (or dropped): forget it and its notifications. */
export function clearSession(date: string, type: string) {
  remove(key(date, type));
  const cur = loadActive();
  if (cur && cur.date === date && cur.type === type) {
    remove(ACTIVE);
    active = null;
    emit();
  }
  void cancelSessionNotices().catch(() => {});
}

/** Pause or resume the active session from anywhere (the live bar). */
export function togglePause() {
  const cur = loadActive();
  if (!cur) return;
  const now = Date.now();
  const { date, type, title, minutes } = cur;
  if (cur.pausedAt)
    saveSession(
      { date, type, title, minutes },
      { ...cur, pausedMs: cur.pausedMs + (now - cur.pausedAt), pausedAt: null },
    );
  else saveSession({ date, type, title, minutes }, { ...cur, pausedAt: now });
}

/** Elapsed ms of a session at `now` (paused time left out). */
export const elapsedOf = (s: SavedSession, now = Date.now()) =>
  Math.max(0, (s.pausedAt ?? now) - s.startedAt - s.pausedMs);

/** The active session, re-rendering when it starts, pauses, resumes or ends. */
export function useActiveSession(): ActiveSession | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    loadActive,
    () => null,
  );
}
