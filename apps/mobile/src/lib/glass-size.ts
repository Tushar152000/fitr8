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
  /** Index of the glass that takes the last glass back off (undo), or -1. */
  undoAt: number;
  /**
   * Stacked mode only (target > 8 glasses): how many glasses the second-last glass stands for
   * ("×2", "×3" …); 0 when nothing is stacked or in a plain row.
   */
  stack: number;
  /** True when the last glass is the always-empty "add" glass (target > 8 glasses). */
  stacked: boolean;
};

const EPS = 1e-6;

/**
 * The glass row on the card (user decisions 2026-11-26). One tap is always one glass.
 * - Target of up to 8 glasses: exactly that many glasses, e.g. 1.9 L / 250 ml = 7.6 → 7 glasses
 *   and a last, smaller glass worth 0.6.
 * - More than 8: 8 glasses. Glasses 1–7 fill one per tap; the 8th stays empty as the "add" glass.
 *   From the 8th glass on, a tap fills the last glass, which then empties into the 7th: the 7th
 *   shows "×2", "×3" … (the glasses it stands for). Reaching the target leaves the last glass full.
 * Water that isn't a whole glass shows as a part-filled glass.
 */
export function glassRow(consumedMl: number, targetMl: number, glass: number): GlassRow {
  const total = Math.max(targetMl / glass, EPS); // glasses in the target, may be fractional
  const count = Math.max(1, Math.ceil(total - EPS));
  const drunk = consumedMl / glass; // glasses drunk, may be fractional
  const reached = consumedMl + EPS >= targetMl;
  const lastWater = (gs: GlassSlot[]) => {
    let i = -1;
    gs.forEach((g, k) => {
      if (g.level > EPS) i = k;
    });
    return i;
  };

  if (count <= ROW_SLOTS) {
    const capacity = (i: number) => (i === count - 1 ? Math.min(1, total - (count - 1)) : 1);
    const glasses: GlassSlot[] = Array.from({ length: count }, (_, i) => {
      const cap = capacity(i);
      return { capacity: cap, level: Math.max(0, Math.min(1, (drunk - i) / cap)) };
    });
    const next = reached ? -1 : glasses.findIndex((g) => g.level < 1 - EPS);
    return { glasses, next, undoAt: lastWater(glasses), stack: 0, stacked: false };
  }

  const add = ROW_SLOTS - 1; // the always-empty last glass
  const pile = add - 1; // the second-last glass, which stacks ×n
  const glasses: GlassSlot[] = [];
  for (let i = 0; i < add; i++) glasses.push({ capacity: 1, level: Math.max(0, Math.min(1, drunk - i)) });
  // Past the 7th glass, part of a glass shows in the add glass; at the target it stays full.
  glasses.push({ capacity: 1, level: reached ? 1 : drunk > add ? drunk - Math.floor(drunk + EPS) : 0 });
  const whole = Math.floor(drunk + EPS);
  const stack = whole > add ? whole - pile : 0; // 8 glasses → the 7th shows ×2
  const next = reached ? -1 : whole < add ? whole : add;
  const undoAt = reached ? add : stack > 0 ? pile : lastWater(glasses.slice(0, add));
  return { glasses, next, undoAt, stack, stacked: true };
}
