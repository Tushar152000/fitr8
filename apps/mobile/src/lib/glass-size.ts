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

export type GlassRow = {
  /** Glasses shown in this round (8, or fewer in the last round: only what's still needed). */
  slots: number;
  /** How many of them are drunk. */
  filled: number;
  /** 0-based round; a target needing more than 8 glasses takes several rounds of the row. */
  round: number;
  rounds: number;
};

/** Slots in round `round` when the target needs `needed` glasses. */
export const roundSlots = (round: number, needed: number) => Math.min(ROW_SLOTS, needed - round * ROW_SLOTS);

/**
 * The glass row on the card (user decision 2026-11-26): every tap fills the next glass, all 8 fill;
 * after the 8th the row starts the next round (the last round shows only the glasses still needed),
 * so the final glass of the final round lands exactly on the target. At or past the target the
 * last round stays full.
 */
export function glassRow(consumedMl: number, targetMl: number, glass: number): GlassRow {
  const drunk = Math.floor(consumedMl / glass);
  const needed = Math.max(1, Math.ceil(targetMl / glass));
  const rounds = Math.ceil(needed / ROW_SLOTS);
  if (consumedMl >= targetMl) {
    const round = rounds - 1;
    const slots = roundSlots(round, needed);
    return { slots, filled: slots, round, rounds };
  }
  const round = Math.min(Math.floor(drunk / ROW_SLOTS), rounds - 1);
  const slots = roundSlots(round, needed);
  return { slots, filled: Math.max(0, Math.min(slots, drunk - round * ROW_SLOTS)), round, rounds };
}
