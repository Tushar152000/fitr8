import { Sparkles } from "lucide-react-native";
import { useEffect } from "react";
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

const LOOP_MS = 5200;

/** Show between `from` and the loop's end (fades in over 6 %, out over the last 5 %). */
function useShowAt(t: SharedValue<number>, from: number, until = 0.95) {
  return useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.get() - from) / 0.06));
    const out = t.get() > until ? Math.max(0, 1 - (t.get() - until) / 0.05) : 1;
    return { opacity: p * out, transform: [{ translateY: (1 - p) * 8 }] };
  });
}

/**
 * A short looping chat for the paywall's coach preview: the user asks, the coach "types" (three
 * dots), then answers with a meal that fits the day. Illustrative copy, not the user's data.
 * Reduce Motion: the finished chat, still.
 */
export function CoachDemo() {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 0.8 : 0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [reduce, t]);

  const ask = useShowAt(t, 0.04);
  const dots = useShowAt(t, 0.22, 0.4);
  const reply = useShowAt(t, 0.42);

  return (
    <View
      style={styles.box}
      accessible
      accessibilityLabel="Example: you ask what to eat for dinner, the coach suggests a meal that fits your day."
    >
      <Animated.View style={[styles.me, ask]}>
        <Text variant="labelMedium" color={c.white}>
          What should I eat for dinner?
        </Text>
      </Animated.View>
      <View>
        <Animated.View style={[styles.coach, { position: "absolute" }, dots]}>
          <Dots t={t} />
        </Animated.View>
        <Animated.View style={[styles.coach, reply]}>
          <View style={styles.coachHead}>
            <Sparkles size={12} color={c.brandText} strokeWidth={2.4} />
            <Text variant="captionStrong" color={c.brandText}>
              Coach
            </Text>
          </View>
          <Text variant="labelMedium" style={{ lineHeight: 18 }}>
            Paneer bhurji with 2 roti: about 520 kcal and 32 g protein. It fits what you have left today.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function Dots({ t }: { t: SharedValue<number> }) {
  const styles = useStyles();
  return (
    <View style={{ flexDirection: "row", gap: 4, paddingVertical: 4 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} t={t} i={i} style={styles.dot} />
      ))}
    </View>
  );
}

function Dot({ t, i, style }: { t: SharedValue<number>; i: number; style: object }) {
  const s = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * Math.abs(Math.sin((t.get() * 40 - i * 0.6) % Math.PI)) }));
  return <Animated.View style={[style, s]} />;
}

const useStyles = makeStyles((c) => ({
  box: { gap: 8, padding: 12, borderRadius: radius.box, backgroundColor: c.ground, minHeight: 132 },
  me: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: c.ink,
  },
  coach: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: c.surface,
  },
  coachHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.ink2 },
}));
