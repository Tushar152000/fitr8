import { Camera, Check, Keyboard } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

const LOOP_MS = 4200;
const TYPED = "2 roti, dal, rice, salad, raita…";
/** Typing shows this many letters at most, then starts again: it never quite finishes. */
const TYPE_MAX = 22;
const TYPE_MS = 120;
const PANE_H = 118;
const LIME = "#C2E04A";

/** The three tags the "photo" finds, popping in one after another. */
const FOUND = [
  { name: "Roti", kcal: 140, at: 0.4 },
  { name: "Dal", kcal: 180, at: 0.47 },
  { name: "Rice", kcal: 210, at: 0.54 },
] as const;

/**
 * Premium banner's visual (user request 2026-11-28: show it, don't make people read): two panes
 * on a loop. Typing (grey): a box slowly types a meal letter by letter and never finishes. Photo
 * (olive): a plate, a lime scan line sweeps it, a flash, then the foods pop in as tags with kcal.
 * Reduce Motion: the finished state, still.
 */
export function PhotoDemo() {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 0.7 : 0);
  const [typed, setTyped] = useState(reduce ? TYPE_MAX : 0);

  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false));
    const id = setInterval(() => setTyped((n) => (n >= TYPE_MAX ? 0 : n + 1)), TYPE_MS);
    return () => {
      cancelAnimation(t);
      clearInterval(id);
    };
  }, [reduce, t]);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel="Typing a meal takes a while. A photo finds every food at once."
    >
      {/* Typing */}
      <View style={[styles.pane, { backgroundColor: c.ground }]}>
        <View style={styles.label}>
          <Keyboard size={14} color={c.ink3} strokeWidth={2} />
          <Text variant="captionStrong" color={c.ink3}>
            Typing
          </Text>
        </View>
        <View style={styles.input}>
          <Text variant="caption" color={c.ink2} numberOfLines={2}>
            {TYPED.slice(0, typed)}
            <Cursor />
          </Text>
        </View>
      </View>

      {/* Photo */}
      <View style={[styles.pane, { backgroundColor: c.brandSoft }]}>
        <View style={styles.label}>
          <Camera size={14} color={c.brandText} strokeWidth={2} />
          <Text variant="captionStrong" color={c.brandText}>
            Photo
          </Text>
        </View>
        <View style={styles.stage}>
          <Plate t={t} />
          <View style={styles.tags}>
            {FOUND.map((f) => (
              <Tag key={f.name} t={t} at={f.at} name={f.name} kcal={f.kcal} />
            ))}
          </View>
        </View>
        <Flash t={t} />
      </View>
    </View>
  );
}

/** A blinking caret after the typed text. */
function Cursor() {
  const c = useColors();
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <Text color={on ? c.ink : "transparent"}>|</Text>;
}

/** A simple plate (rim + three foods) with the lime scan line sweeping down early in the loop. */
function Plate({ t }: { t: SharedValue<number> }) {
  const c = useColors();
  const styles = useStyles();
  const scan = useAnimatedStyle(() => {
    const p = Math.min(1, t.get() / 0.32);
    return { opacity: t.get() < 0.34 ? 1 : 0, transform: [{ translateY: -24 + p * 48 }] };
  });
  const fade = useAnimatedStyle(() => ({ opacity: t.get() > 0.94 ? (1 - t.get()) / 0.06 : 1 }));
  return (
    <Animated.View style={[styles.plate, { borderColor: c.surface, backgroundColor: c.surface }, fade]}>
      <View style={[styles.food, { backgroundColor: "#E7C08A", left: 9, top: 12, width: 20, height: 16 }]} />
      <View style={[styles.food, { backgroundColor: "#E2A93B", right: 9, top: 14, width: 16, height: 16 }]} />
      <View style={[styles.food, { backgroundColor: "#F3EEDF", left: 16, bottom: 9, width: 22, height: 14 }]} />
      <Animated.View style={[styles.scan, scan]} />
    </Animated.View>
  );
}

/** One found food: pops in at `at`, stays, fades with the loop's end. */
function Tag({ t, at, name, kcal }: { t: SharedValue<number>; at: number; name: string; kcal: number }) {
  const c = useColors();
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.get() - at) / 0.06));
    const out = t.get() > 0.94 ? (1 - t.get()) / 0.06 : 1;
    return { opacity: p * out, transform: [{ scale: 0.6 + p * 0.4 }, { translateX: (1 - p) * -6 }] };
  });
  return (
    <Animated.View style={[styles.tag, { backgroundColor: c.surface }, style]}>
      <Check size={10} color={c.brandText} strokeWidth={3} />
      <Text variant="caption" weight={600} numberOfLines={1}>
        {name}
      </Text>
      <Text variant="caption" color={c.ink2} tabular>
        {kcal}
      </Text>
    </Animated.View>
  );
}

/** The camera flash right after the scan. */
function Flash({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(t.get() - 0.35);
    return { opacity: d < 0.03 ? (1 - d / 0.03) * 0.7 : 0 };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "#ffffff",
          borderRadius: radius.box,
        },
        style,
      ]}
    />
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", gap: 8 },
  pane: { flex: 1, height: PANE_H, padding: 10, gap: 8, borderRadius: radius.box, overflow: "hidden" },
  label: { flexDirection: "row", alignItems: "center", gap: 5 },
  input: { flex: 1, padding: 8, borderRadius: radius.tile, backgroundColor: c.surface },
  stage: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  plate: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, overflow: "hidden" },
  food: { position: "absolute", borderRadius: 8 },
  scan: { position: "absolute", left: 0, right: 0, top: 26, height: 3, backgroundColor: LIME },
  tags: { flex: 1, gap: 3 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
}));
