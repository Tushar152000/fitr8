import { useIsFocused } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/** A jolt this far from resting gravity (in g) counts as a shake. */
const THRESHOLD = 1.1;
/** At most one shake per this many ms. */
const COOLDOWN_MS = 900;

/**
 * Calls `onShake` when the phone is shaken (2026-11-28: shake to make the hydration water move).
 * Listens to the accelerometer only while the screen is focused and the app is in the foreground,
 * at 10 Hz; no permission needed. Does nothing where there's no accelerometer (web preview,
 * simulator) or when `enabled` is false (Reduce Motion).
 */
export function useShake(onShake: () => void, enabled = true) {
  const focused = useIsFocused();
  const latest = useRef(onShake);
  useEffect(() => {
    latest.current = onShake;
  });

  useEffect(() => {
    if (!enabled || !focused) return;
    let sub: { remove: () => void } | null = null;
    let last = 0;
    let live = true;

    const start = () => {
      if (sub) return;
      Accelerometer.setUpdateInterval(100);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const jolt = Math.abs(Math.sqrt(x * x + y * y + z * z) - 1);
        const now = Date.now();
        if (jolt > THRESHOLD && now - last > COOLDOWN_MS) {
          last = now;
          latest.current();
        }
      });
    };
    const stop = () => {
      sub?.remove();
      sub = null;
    };

    void Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (ok && live && AppState.currentState === "active") start();
      })
      .catch(() => {});
    const app = AppState.addEventListener("change", (s) => (s === "active" ? start() : stop()));
    return () => {
      live = false;
      app.remove();
      stop();
    };
  }, [enabled, focused]);
}
