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

/** Glasses in one row of the Home hydration card. */
export const ROW_SLOTS = 8;

export type GlassSlot = {
  /** How much of this glass is drunk, 0–1 of its own capacity. */
  level: number;
  /** Capacity as a share of a whole glass: 1, or less for the last glass of an uneven target. */
  capacity: number;
};

export type GlassRow = {
  /** The glasses of this round (8, fewer in the last round). */
  glasses: GlassSlot[];
  /** Index (in `glasses`) of the glass the next tap fills, or -1 when the round/target is done. */
  next: number;
  /** Index of the last glass with water in it (undo target), or -1. */
  last: number;
  /** 0-based round; a target of more than 8 glasses takes several rounds. */
  round: number;
  rounds: number;
};

const EPS = 1e-6;

/**
 * The glass row on the card (user decisions 2026-11-26). The target is `targetMl / glass` glasses,
 * e.g. 3.4 L / 250 ml = 13.6: 13 whole glasses and a last, smaller glass worth 0.6. Glasses run in
 * rounds of 8: every tap fills the next glass, after the 8th the next round starts. Water that isn't
 * a whole number of glasses (the glass size changed during the day) fills a glass part way.
 */
export function glassRow(consumedMl: number, targetMl: number, glass: number): GlassRow {
  const total = Math.max(targetMl / glass, EPS); // glasses in the target, may be fractional
  const count = Math.max(1, Math.ceil(total - EPS));
  const rounds = Math.ceil(count / ROW_SLOTS);
  const drunk = consumedMl / glass; // glasses drunk, may be fractional
  const capacity = (i: number) => (i === count - 1 ? Math.min(1, total - (count - 1)) : 1);
  // First glass that isn't full yet; = count when the target is reached.
  let first = 0;
  while (first < count && drunk - first + EPS >= capacity(first)) first++;
  const round = Math.min(Math.floor(first / ROW_SLOTS), rounds - 1);
  const start = round * ROW_SLOTS;
  const end = Math.min(count, start + ROW_SLOTS);
  const glasses: GlassSlot[] = [];
  for (let i = start; i < end; i++) {
    const cap = capacity(i);
    glasses.push({ capacity: cap, level: Math.max(0, Math.min(1, (drunk - i) / cap)) });
  }
  const next = first < end ? first - start : -1;
  let last = -1;
  glasses.forEach((g, i) => {
    if (g.level > EPS) last = i;
  });
  return { glasses, next, last, round, rounds };
}
