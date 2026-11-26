import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

/** The glass sizes the Home hydration card offers (ml). */
export const GLASS_SIZES = [150, 200, 250, 300, 350, 500] as const;
export const DEFAULT_GLASS_ML = 250;
const KEY = "fitr8.glassMl";

let glassMl: number = DEFAULT_GLASS_ML;
let loaded = false;
const listeners = new Set<() => void>();

const valid = (n: number) => (GLASS_SIZES as readonly number[]).includes(n);

async function read(): Promise<number | null> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    const n = Number(raw);
    return valid(n) ? n : null;
  } catch {
    return null;
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  void read().then((n) => {
    if (n != null && n !== glassMl) {
      glassMl = n;
      listeners.forEach((l) => l());
    }
  });
}

/** One tap on the Home hydration card adds this much. A per-phone preference (not synced). */
export function useGlassMl(): number {
  load();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => glassMl,
    () => glassMl,
  );
}

export function setGlassMl(ml: number) {
  if (!valid(ml) || ml === glassMl) return;
  glassMl = ml;
  listeners.forEach((l) => l());
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, String(ml));
    else void SecureStore.setItemAsync(KEY, String(ml)).catch(() => {});
  } catch {
    // Private mode / blocked storage: the choice lasts for this session only.
  }
}

/** Most glasses the Home hydration card's row can show. */
export const ROW_SLOTS = 8;

export type GlassSlot = {
  /** How much of this glass is drunk, 0–1 of its own capacity. */
  level: number;
  /** Capacity as a share of a whole glass: 1, or less for the last glass of an uneven target. */
  capacity: number;
};

export type GlassRow = {
  glasses: GlassSlot[];
  /** Index of the glass the next tap fills, or -1 when the target is reached. */
  next: number;
  /** Index of the last glass with water in it (undo target), or -1. */
  last: number;
  /** Water one drawn glass stands for (ml): the glass size, or more when the target is doubled up. */
  perGlassMl: number;
};

const EPS = 1e-6;

/**
 * The glass row on the card (user decisions 2026-11-26): all glasses in one row, no rounds.
 * - Target fits in 8 glasses: one drawn glass per glass of water, e.g. 1.9 L / 250 ml = 7.6 → 7
 *   glasses and a last, smaller glass worth 0.6. One tap fills one glass.
 * - More than 8: the 8 glasses share the target ("doubled up"), e.g. 3.4 L → 425 ml each, so one
 *   250 ml tap fills ~59 % of a glass and the next tap finishes it and starts the next.
 * Water that isn't a whole glass always shows as a part-filled glass.
 */
export function glassRow(consumedMl: number, targetMl: number, glass: number): GlassRow {
  const total = Math.max(targetMl / glass, EPS); // glasses of water in the target
  const fits = total <= ROW_SLOTS + EPS;
  const count = fits ? Math.max(1, Math.ceil(total - EPS)) : ROW_SLOTS;
  const perGlassMl = fits ? glass : targetMl / ROW_SLOTS;
  const capacity = (i: number) => (fits && i === count - 1 ? Math.min(1, total - (count - 1)) : 1);
  const drunk = consumedMl / perGlassMl; // drawn glasses drunk, may be fractional
  const glasses: GlassSlot[] = [];
  for (let i = 0; i < count; i++) {
    const cap = capacity(i);
    glasses.push({ capacity: cap, level: Math.max(0, Math.min(1, (drunk - i) / cap)) });
  }
  const reached = consumedMl + EPS >= targetMl;
  const next = reached ? -1 : glasses.findIndex((g) => g.level < 1 - EPS);
  let last = -1;
  glasses.forEach((g, i) => {
    if (g.level > EPS) last = i;
  });
  return { glasses, next, last, perGlassMl };
}
