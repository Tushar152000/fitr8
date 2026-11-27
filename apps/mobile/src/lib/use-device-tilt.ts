import { useIsFocused } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";

/** The water never leans further than this (degrees), so it stays inside the card. */
const MAX_DEG = 18;
/**
 * Which way the screen has to turn the water to keep it level. If on a device the water leans the
 * wrong way (sensor axes differ between platforms), flip this sign.
 */
const SIGN = -1;

/**
 * How far the phone is rolled left/right, as the angle that keeps on-screen water level with the
 * ground (2026-11-28: the hydration water follows the phone like water in a glass). Reads the
 * accelerometer at ~20 Hz only while the screen is focused and the app is active, and springs
 * toward the reading so it moves like liquid, not jitter. 0 when disabled (Reduce Motion) or
 * without an accelerometer.
 */
export function useDeviceTilt(enabled = true): SharedValue<number> {
  const tilt = useSharedValue(0);
  const focused = useIsFocused();

  useEffect(() => {
    if (!enabled || !focused) {
      tilt.set(withSpring(0, { damping: 14, stiffness: 80 }));
      return;
    }
    let sub: { remove: () => void } | null = null;
    let live = true;
    const start = () => {
      if (sub) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        // Roll: the gravity's sideways share against the rest (works upright or lying back).
        const roll = (Math.atan2(x, Math.sqrt(y * y + z * z)) * 180) / Math.PI;
        const target = Math.max(-MAX_DEG, Math.min(MAX_DEG, SIGN * roll));
        tilt.set(withSpring(target, { damping: 12, stiffness: 60, mass: 0.8 }));
      });
    };
    const stop = () => {
      sub?.remove();
      sub = null;
      tilt.set(withSpring(0, { damping: 14, stiffness: 80 }));
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
  }, [enabled, focused, tilt]);

  return tilt;
}
