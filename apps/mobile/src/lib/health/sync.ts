import {
  HEALTH_SYNC_MAX_DAILY,
  HEALTH_SYNC_MAX_SAMPLES,
  type HealthConnectionDto,
  type HealthDailyInput,
  type HealthSampleInput,
  type HealthSyncResultDto,
} from "@fitr8/contracts";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api, ApiError } from "../api";
import { healthAdapter } from "./index";

/** First sync reads this far back (Health Connect only allows 30 days before access was given). */
const FIRST_SYNC_DAYS = 30;
/** Every sync re-reads this much already-synced time: late watch data arrives, and upserts are harmless. */
const OVERLAP_MS = 2 * 86_400_000;
/** Automatic syncs (app opened) at most this often. */
const AUTO_EVERY_MS = 15 * 60_000;
const DAY_MS = 86_400_000;

interface SyncState {
  /** Instant everything up to was read. */
  syncedTo: string | null;
  lastRunAt: string | null;
}
const EMPTY: SyncState = { syncedTo: null, lastRunAt: null };
const key = (userId: string, platform: string) => `fitr8.health.${platform}.${userId}`;

async function readState(userId: string, platform: string): Promise<SyncState> {
  try {
    const raw =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(key(userId, platform))
        : await SecureStore.getItemAsync(key(userId, platform));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as SyncState) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function writeState(userId: string, platform: string, state: SyncState | null) {
  try {
    const k = key(userId, platform);
    if (Platform.OS === "web") {
      if (state) globalThis.localStorage?.setItem(k, JSON.stringify(state));
      else globalThis.localStorage?.removeItem(k);
    } else if (state) await SecureStore.setItemAsync(k, JSON.stringify(state));
    else await SecureStore.deleteItemAsync(k);
  } catch {
    // Worst case the next sync re-reads more (upserts make that harmless).
  }
}

const localMidnight = (d: Date) => {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  return m;
};

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export interface SyncOutcome {
  samples: number;
  daily: number;
}

let running: Promise<SyncOutcome | null> | null = null;

/**
 * Reads new health records on the phone and sends them all to FITR8 (in batches of 500). Runs one
 * at a time; automatic runs at most every 15 minutes, `force` (after connecting, pull to refresh)
 * always. Returns null when nothing ran.
 */
export function syncHealth(userId: string, { force = false } = {}): Promise<SyncOutcome | null> {
  running ??= run(userId, force).finally(() => {
    running = null;
  });
  return running;
}

async function run(userId: string, force: boolean): Promise<SyncOutcome | null> {
  const adapter = healthAdapter();
  if (!adapter || (await adapter.availability()) !== "available") return null;
  const state = await readState(userId, adapter.platform);
  const now = new Date();
  if (!force && state.lastRunAt && now.getTime() - Date.parse(state.lastRunAt) < AUTO_EVERY_MS) return null;

  const from = state.syncedTo
    ? new Date(Math.max(Date.parse(state.syncedTo) - OVERLAP_MS, now.getTime() - FIRST_SYNC_DAYS * DAY_MS))
    : new Date(now.getTime() - FIRST_SYNC_DAYS * DAY_MS);
  const firstDay = localMidnight(from);
  const days = Math.ceil((now.getTime() - firstDay.getTime()) / DAY_MS) + 1;

  const [samples, daily] = await Promise.all([adapter.read(from, now), adapter.daily(firstDay, days)]);
  const total = await send(adapter.platform, samples, daily);
  await writeState(userId, adapter.platform, { syncedTo: now.toISOString(), lastRunAt: now.toISOString() });
  return total;
}

async function send(platform: string, samples: HealthSampleInput[], daily: HealthDailyInput[]): Promise<SyncOutcome> {
  const total: SyncOutcome = { samples: 0, daily: 0 };
  const sampleBatches = chunks(samples, HEALTH_SYNC_MAX_SAMPLES);
  const dailyBatches = chunks(daily, HEALTH_SYNC_MAX_DAILY);
  const n = Math.max(sampleBatches.length, dailyBatches.length, 1);
  for (let i = 0; i < n; i++) {
    const res = await api<HealthSyncResultDto>("/api/health-data/sync", {
      json: { platform, samples: sampleBatches[i] ?? [], daily: dailyBatches[i] ?? [] },
    });
    total.samples += res.samples;
    total.daily += res.daily;
  }
  return total;
}

export type ConnectResult =
  { ok: true; connection: HealthConnectionDto } | { ok: false; reason: "unavailable" | "needs_install" | "denied" };

/**
 * The Connect button: the system permission screen, then tells FITR8 and runs the first sync.
 * Nothing is sent before the user allows access.
 */
export async function connectHealth(userId: string): Promise<ConnectResult> {
  const adapter = healthAdapter();
  if (!adapter) return { ok: false, reason: "unavailable" };
  const availability = await adapter.availability();
  if (availability !== "available") return { ok: false, reason: availability };
  const permissions = await adapter.requestAccess();
  if (!permissions.length) return { ok: false, reason: "denied" };
  const connection = await api<HealthConnectionDto>("/api/health-data/connect", {
    json: { platform: adapter.platform, permissions },
  });
  await writeState(userId, adapter.platform, null);
  await syncHealth(userId, { force: true }).catch(() => null);
  return { ok: true, connection };
}

/** Stops syncing (and with `deleteData`, deletes what FITR8 stored). Access stays in the platform's settings. */
export async function disconnectHealth(userId: string, deleteData: boolean) {
  const adapter = healthAdapter();
  const platform = adapter?.platform ?? (Platform.OS === "ios" ? "APPLE_HEALTH" : "HEALTH_CONNECT");
  try {
    await api(`/api/health-data/connections/${platform}?deleteData=${deleteData}`, { method: "DELETE" });
  } catch (err) {
    // Already disconnected on the server (another phone): fine.
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }
  await writeState(userId, platform, null);
}
