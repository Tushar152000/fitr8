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

/** Most glasses the Home hydration card's row can show, the "+" glass included. */
export const ROW_SLOTS = 8;

export type GlassSlot = {
  /** How much of this glass is drunk, 0–1 of its own capacity. */
  level: number;
  /** Capacity as a share of a whole glass: 1, or less for the last glass of an uneven target. */
  capacity: number;
};

export type GlassRow = {
  /** The row's glasses (up to 7; the "+" glass is separate). */
  glasses: GlassSlot[];
  /** Index of the glass the next tap fills, or -1 when every glass in the row is full. */
  next: number;
  /** Index of the last glass with water (a tap on a full glass takes the last glass back), or -1. */
  last: number;
  /** True once every glass in the row is full: the "+" glass shows to add more. */
  plus: boolean;
  /** Glasses drunk past the row, shown under the "+" glass as "×n" (whole glasses). */
  extra: number;
  /** Water the row itself holds, ml: a tap on a row glass never adds past it. */
  rowMl: number;
};

const EPS = 1e-6;
const ROW_GLASSES = ROW_SLOTS - 1; // one slot is kept for the "+" glass

/**
 * The glass row on the card (user decisions 2026-11-26):
 * - The target is `targetMl / glass` glasses, e.g. 1.9 L / 250 ml = 7.6. The row shows them (up to
 *   7), the last one smaller when the target isn't whole glasses. All start empty and fill in order,
 *   one per tap, whichever glass is tapped.
 * - Once every glass in the row is full, an empty "+" glass shows at the end. Each tap on it adds a
 *   glass and the count under it goes ×1, ×2, ×3 …; the "+" glass itself never fills.
 * - A tap on any full glass takes the last glass back (the ×n count first).
 * A target over 7 glasses keeps 7 in the row; the rest are counted on the "+" glass.
 */
export function glassRow(consumedMl: number, targetMl: number, glass: number): GlassRow {
  const total = Math.max(targetMl / glass, EPS); // glasses in the target, may be fractional
  const count = Math.max(1, Math.ceil(total - EPS));
  const shown = Math.min(count, ROW_GLASSES);
  const drunk = consumedMl / glass; // glasses drunk, may be fractional
  const capacity = (i: number) => (count <= ROW_GLASSES && i === count - 1 ? Math.min(1, total - (count - 1)) : 1);
  const glasses: GlassSlot[] = [];
  let rowGlasses = 0; // the row's capacity, in glasses
  for (let i = 0; i < shown; i++) {
    const cap = capacity(i);
    glasses.push({ capacity: cap, level: Math.max(0, Math.min(1, (drunk - rowGlasses) / cap)) });
    rowGlasses += cap;
  }
  const next = glasses.findIndex((g) => g.level < 1 - EPS);
  let last = -1;
  glasses.forEach((g, k) => {
    if (g.level > EPS) last = k;
  });
  return {
    glasses,
    next,
    last,
    plus: next === -1,
    extra: Math.max(0, Math.floor(drunk - rowGlasses + EPS)),
    rowMl: rowGlasses * glass,
  };
}
