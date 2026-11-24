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

/**
 * The glass row on the card: `slots` icons, the first `filled` drunk. Past the first few glasses
 * the window slides so there are always glasses left to tap until the target is reached.
 */
export function glassRow(consumedMl: number, targetMl: number, glass: number, slots = 8) {
  const drunk = Math.floor(consumedMl / glass);
  const needed = Math.max(1, Math.ceil(targetMl / glass));
  const reached = consumedMl >= targetMl;
  if (reached) return { filled: slots, slots };
  // Keep at least 2 empty glasses visible while there's water left to drink.
  const filled = Math.min(drunk, slots - 2, needed);
  return { filled: Math.max(0, filled), slots };
}
