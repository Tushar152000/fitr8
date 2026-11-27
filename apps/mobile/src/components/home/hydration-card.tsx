import { Minus, Pencil, Plus } from "lucide-react-native";
import { useEffect, useState, useRef, type ComponentRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Sheet } from "@/components/sheet";
import { FieldError, PressableScale, Text } from "@/components/ui";
import { GLASS_SIZES, setGlassMl, useGlassMl } from "@/lib/glass-size";
import { haptic } from "@/lib/haptics";
import { useDeviceTilt } from "@/lib/use-device-tilt";
import { useShake } from "@/lib/use-shake";
import { fade, makeStyles, radius, useColors, useScheme } from "@/lib/theme";
import { useWater } from "@/lib/use-water";
import { startLeak } from "./leak-overlay";
import { WaterWave } from "./water-wave";

const L = (ml: number) => (Math.round(ml / 10) / 100).toFixed(2).replace(/0$/, "");
const HEIGHT = 156;
const UNDO_MS = 4000;
/** Quick sizes offered on a long press of "+" (the glass sizes plus a bottle). */
const QUICK = [150, 250, 330, 500, 750] as const;
const LIME = "#C2E04A";

/**
 * Home hydration card (redesign 2026-11-28, user request; light and dark):
 * - The card fills with water from the bottom: two layered waves (`WaterWave`) rise with a spring as
 *   you drink and drift on a loop; adding water swells the surface and sends a ripple from "+".
 * - Big litres ("1.25 L of 2.5 L"), glasses under it, the glass size (pencil → change it).
 * - "+" adds one glass (never more than is left, API minimum 50 ml); a long press opens quick sizes
 *   (150 ml … a 750 ml bottle).
 * - "−" beside "+" takes the last glass off (live once the server has the log; a long press drains
 *   it with a leak — a stream from the card's bottom-right corner down to the tab bar, `LeakOverlay`); after each add a
 *   short "Added 250 ml" confirmation shows for 4 s. The water fills from empty once, on first
 *   appearance; a tap on the card, or shaking the phone (`useShake`), makes it slosh.
 * - Target reached: "Target reached" and the water glows lime for a moment.
 * White card in light mode, the dark panel in dark mode. Reduce Motion: still water, no ripple.
 */
export function HydrationCard() {
  const c = useColors();
  const styles = useStyles();
  const dark = useScheme() === "dark";
  const reduce = useReducedMotion();
  const water = useWater();
  const glass = useGlassMl();
  const [sizing, setSizing] = useState(false);
  const [quick, setQuick] = useState(false);
  const [width, setWidth] = useState(0);
  const [bump, setBump] = useState(0);
  // The water fills from empty once, when the card first appears (not on every return to Home);
  // a tap on the card makes it slosh.
  const [slosh, setSlosh] = useState(0);
  const wrapRef = useRef<ComponentRef<typeof View>>(null);
  // Tilt the phone and the water stays level, like water in a glass.
  const deviceTilt = useDeviceTilt(!reduce);
  // Shake the phone and the water sloshes too.
  useShake(() => {
    haptic.tap();
    setSlosh((n) => n + 1);
  }, !reduce);
  const [added, setAdded] = useState<{ ml: number; at: number } | null>(null);
  const d = water.water.data;
  const error = water.add.error ?? water.undo.error;
  const left = d ? Math.max(0, d.targetMl - d.consumedMl) : 0;
  const done = d ? d.consumedMl >= d.targetMl : false;
  const level = d && d.targetMl > 0 ? Math.min(1, d.consumedMl / d.targetMl) : 0;
  const glasses = d ? Math.floor(d.consumedMl / glass) : 0;
  const glassesTarget = d ? Math.ceil(d.targetMl / glass) : 0;

  // The undo pill hides itself after UNDO_MS.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), UNDO_MS);
    return () => clearTimeout(t);
  }, [added]);

  // Ripple from "+" on each add, and a lime glow when the target is reached.
  const ripple = useSharedValue(0);
  const glow = useSharedValue(0);
  const addWater = (ml: number) => {
    const amount = Math.max(50, Math.round(ml));
    const reaches = d ? d.consumedMl < d.targetMl && d.consumedMl + amount >= d.targetMl : false;
    water.add.mutate(amount);
    setAdded({ ml: amount, at: Date.now() });
    setBump((b) => b + 1);
    if (!reduce) {
      ripple.set(0);
      ripple.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }));
      if (reaches) glow.set(withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 1400 })));
    }
  };
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.get() > 0 && ripple.get() < 1 ? 1 - ripple.get() : 0,
    transform: [{ scale: 1 + ripple.get() * 2.4 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() * 0.35 }));

  const ink = dark ? "#ffffff" : c.ink;
  const soft = dark ? "rgba(255,255,255,0.65)" : c.ink2;
  const front = dark ? fade("#2f97c1", 0.55) : fade("#35cefe", 0.32);
  const back = dark ? fade("#35cefe", 0.25) : fade("#a6dded", 0.45);

  return (
    // The wrapper lets the leak's drops fall outside the card, over the card below.
    <View style={styles.wrap} ref={wrapRef} collapsable={false}>
      <Pressable
        style={styles.card}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={() => {
          haptic.tap();
          setSlosh((n) => n + 1);
        }}
        accessibilityHint="Tap to make the water move"
      >
        <WaterWave
          width={width}
          height={HEIGHT}
          level={level}
          bump={bump}
          slosh={slosh}
          deviceTilt={deviceTilt}
          front={front}
          back={back}
        />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: LIME }, glowStyle]} pointerEvents="none" />

        <View style={styles.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="labelMedium" color={soft}>
              Hydration
            </Text>
            {d ? (
              <Text
                weight={700}
                size={28}
                color={ink}
                tabular
                accessibilityLiveRegion="polite"
                numberOfLines={1}
                style={{ letterSpacing: -0.6 }}
              >
                {done ? "Target reached" : `${L(d.consumedMl)} L`}
                {!done && (
                  <Text weight={500} size={15} color={soft} tabular>
                    {` of ${L(d.targetMl)} L`}
                  </Text>
                )}
              </Text>
            ) : (
              <View style={{ height: 34 }} />
            )}
            {d && (
              <Text variant="labelMedium" color={soft} tabular>
                {done
                  ? `${L(d.consumedMl)} L today · nice work`
                  : `${glasses} of ${glassesTarget} glasses · ${L(left)} L left`}
              </Text>
            )}
          </View>

          {/* Take the last glass off (2026-11-28), then add a glass (long press for quick sizes). */}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={water.undoable ? `Remove the last ${water.undoable.ml} ml` : "Nothing to remove"}
            disabled={!water.undoable}
            onPress={() => {
              if (!water.undoable) return;
              water.undo.mutate(water.undoable.id);
              setAdded(null);
              setSlosh((n) => n + 1);
            }}
            // Long press: the same, as a drain — the water leaks out of the card onto the one below.
            onLongPress={() => {
              if (!water.undoable) return;
              haptic.warning();
              water.undo.mutate(water.undoable.id);
              setAdded(null);
              setSlosh((n) => n + 1);
              // The leak runs from the card's bottom-right corner down to the tab bar.
              wrapRef.current?.measureInWindow((x, y, w, h) =>
                startLeak({ x: x + w - 26, y: y + h - 2, color: dark ? "#35cefe" : "#2f97c1" }),
              );
            }}
            accessibilityHint="Long press to drain it with a leak"
            hitSlop={6}
            style={[styles.minus, !water.undoable && { opacity: 0.35 }]}
          >
            <Minus size={18} color={ink} strokeWidth={2.6} />
          </PressableScale>
          <View style={styles.addWrap}>
            <Animated.View style={[styles.ripple, { borderColor: dark ? "#35cefe" : "#2f97c1" }, rippleStyle]} />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Add a glass, ${Math.max(50, Math.round(Math.min(glass, left || glass)))} ml`}
              accessibilityHint="Long press for other sizes"
              disabled={!d}
              onPress={() => addWater(Math.min(glass, left || glass))}
              onLongPress={() => setQuick(true)}
              style={[styles.add, { backgroundColor: dark ? "#35cefe" : "#2f97c1" }]}
            >
              <Plus size={24} color={dark ? "#0c0c0c" : "#ffffff"} strokeWidth={2.6} />
            </PressableScale>
          </View>
        </View>

        <View style={styles.foot}>
          {added ? (
            // A short confirmation; the "−" button takes it back.
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={styles.undo}>
              <Text variant="labelMedium" color={ink}>
                Added {added.ml} ml
              </Text>
            </Animated.View>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Glass size ${glass} ml. Change`}
              onPress={() => setSizing(true)}
              hitSlop={10}
              style={styles.size}
            >
              <Text variant="labelMedium" color={soft} tabular>
                1 glass = {glass} ml
              </Text>
              <Pencil size={12} color={soft} />
            </PressableScale>
          )}
        </View>
        {error && <FieldError>{error.message || "Couldn't save. Try again."}</FieldError>}

        <Sheet open={quick} onClose={() => setQuick(false)} title="Add water" subtitle="Pick an amount">
          <View style={styles.sizes}>
            {QUICK.map((ml) => (
              <Chip
                key={ml}
                label={ml === 750 ? "Bottle · 750 ml" : `${ml} ml`}
                onPress={() => {
                  setQuick(false);
                  addWater(ml);
                }}
              />
            ))}
          </View>
        </Sheet>

        <Sheet open={sizing} onClose={() => setSizing(false)} title="Glass size">
          <View style={styles.sizes}>
            {GLASS_SIZES.map((ml) => (
              <Chip
                key={ml}
                label={`${ml} ml`}
                selected={ml === glass}
                onPress={() => {
                  setGlassMl(ml);
                  setSizing(false);
                }}
              />
            ))}
          </View>
        </Sheet>
      </Pressable>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: c.ink }]}
    >
      <Text weight={600} color={selected ? c.surface : c.ink} tabular>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  wrap: { zIndex: 10, elevation: 10 },
  card: {
    height: HEIGHT,
    borderRadius: radius.card,
    padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
    backgroundColor: c.surface,
    ...shadows.card,
    // Dark mode: the lifted panel with a faint edge so it doesn't vanish on the black page.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.panelLine,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  addWrap: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  minus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 8,
    backgroundColor: fade(c.surface, 0.85),
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  add: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  ripple: { position: "absolute", width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  foot: { flexDirection: "row", alignItems: "center", minHeight: 32 },
  size: { flexDirection: "row", alignItems: "center", gap: 6 },
  undo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: fade(c.surface, 0.85),
  },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexGrow: 1,
    flexBasis: "30%",
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: c.chip,
    alignItems: "center",
    justifyContent: "center",
  },
}));
