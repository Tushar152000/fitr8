import { Sparkles } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Line } from "@/components/skeletons";
import { MovingGradient, Text } from "@/components/ui";
import type { CoachMessage } from "@/lib/use-coach-chat";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { MealDraftCard } from "./meal-draft-card";
import { RichText } from "./rich-text";
import { ToolStatusChip } from "./tool-status-chip";

/**
 * One message in the coach thread. Yours sits right on the strong tone; the coach's sits left on
 * the surface next to its avatar, with its tool chips above, pulsing dots until the first words,
 * its formatting drawn (`RichText`), any cards a tool made (the drafted meal) and a note if cut.
 */
export function Bubble({ message: m }: { message: CoachMessage }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  if (m.role === "user") {
    return (
      <Animated.View entering={reduce ? undefined : FadeInDown.duration(200)} style={[styles.bubble, styles.mine]}>
        <Text color={c.onStrong}>{m.text}</Text>
      </Animated.View>
    );
  }
  const thinking = m.streaming && !m.text && m.tools.every((t) => t.status !== "running");
  return (
    <View style={styles.row}>
      {/* The coach's avatar, once per reply (2026-11-28 refresh). */}
      <View style={styles.avatar}>
        <MovingGradient width={28} height={28} motion="still" />
        <Sparkles size={14} color="#C2E04A" strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {m.tools.length > 0 && (
          <View style={styles.tools}>
            {m.tools.map((t) => (
              <ToolStatusChip key={t.id} tool={t} />
            ))}
          </View>
        )}
        {(m.text || thinking) && (
          <View style={[styles.bubble, styles.theirs]} accessibilityLiveRegion={m.streaming ? "polite" : "none"}>
            {m.text ? <RichText text={m.text} /> : <ThinkingDots />}
          </View>
        )}
        {m.cards?.map((card, i) =>
          card.kind === "meal_draft" ? <MealDraftCard key={`${card.mealId}-${i}`} card={card} /> : null,
        )}
        {m.cut && <Text variant="meta">Reply stopped before it finished.</Text>}
      </View>
    </View>
  );
}

/** Three softly pulsing dots while the coach is thinking. */
function ThinkingDots() {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 6 }} accessibilityLabel="Thinking">
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} color={c.ink3} />
      ))}
    </View>
  );
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), -1, true)));
    return () => cancelAnimation(t);
  }, [reduce, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + t.get() * 0.65, transform: [{ translateY: -t.get() * 2 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }, style]} />;
}

/** The thread while the last chat loads: coach bubbles of skeleton lines around one of yours. */
export function ThreadSkeleton() {
  const styles = useStyles();
  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.bubble, styles.theirs, { gap: 8 }]}>
        <Line tone="card" width="90%" />
        <Line tone="card" width="70%" />
      </View>
      <View style={{ alignSelf: "flex-end", width: "60%" }}>
        <Line height={40} />
      </View>
      <View style={[styles.bubble, styles.theirs, { gap: 8 }]}>
        <Line tone="card" width="80%" />
        <Line tone="card" width="95%" />
        <Line tone="card" width="40%" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bubble: { maxWidth: "88%", borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12 },
  mine: { alignSelf: "flex-end", backgroundColor: c.strong, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", maxWidth: "100%", backgroundColor: c.surface, borderTopLeftRadius: 6 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, alignSelf: "stretch" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
}));
