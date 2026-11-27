import { ArrowUpRight, BookOpen, Brain, Crown, Info, PenLine, Sparkles } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { PillButton, PressableScale, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { CoachAvatar } from "./coach-avatar";
import { useCoachSuggestions } from "@/lib/coach-suggestions";
import { formatInt } from "@/lib/format";
import { dayQuery, waterQuery } from "@/lib/queries";
import { openPremium } from "@/lib/premium";
import { fade, makeStyles, useColors, radius } from "@/lib/theme";

/**
 * An empty chat: the Premium card (free plan), the coach intro (a calm theme card since 2026-11-28),
 * "Try asking" pills built from today (`useCoachSuggestions`) that send at once, and the
 * not-medical-advice note.
 */
export function Intro({ onPick, locked }: { onPick: (text: string) => void; locked: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const suggestions = useCoachSuggestions();
  const reduce = useReducedMotion();
  const first = useMe().name?.trim().split(/\s+/)[0] ?? null;
  const day = useQuery(dayQuery).data;
  const water = useQuery(waterQuery).data;
  const stats: { label: string; value: string }[] = [];
  if (day?.target) {
    const kcalLeft = Math.round(day.target.kcal - day.eaten.kcal);
    stats.push({ label: kcalLeft >= 0 ? "kcal left" : "kcal over", value: formatInt(Math.abs(kcalLeft)) });
    stats.push({
      label: "protein to go",
      value: `${formatInt(Math.max(0, Math.round(day.target.proteinG - day.eaten.proteinG)))} g`,
    });
  }
  if (water && water.targetMl > 0)
    stats.push({ label: "water", value: `${Math.min(100, Math.round((water.consumedMl / water.targetMl) * 100))}%` });
  return (
    <View style={{ gap: 16 }}>
      {locked && (
        <View style={styles.premium}>
          <PremiumBadge />
          <View style={{ gap: 4 }}>
            <Text variant="heading3">Your coach is part of Premium</Text>
            <Text variant="bodySm" color={c.ink2}>
              Try it free for 7 days: answers made for your goal, meals and training, backed by sports science.
            </Text>
          </View>
          <PillButton icon={Crown} label="Unlock the AI Coach" onPress={() => openPremium("coach")} />
        </View>
      )}

      {/* Calm intro in the theme colours (2026-11-28 refresh; was the always-dark lime-glow card). */}
      <View style={styles.hero}>
        {/* A faint olive tint from the top, so the banner stands apart while staying calm. */}
        <LinearGradient
          colors={[fade(c.brand, 0.12), fade(c.brand, 0)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.75 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <CoachAvatar />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading3">
              {first ? `Hi ${first}, I've looked at your day` : "Your fitness & nutrition coach"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <PulseDot color={c.brand} />
              <Text variant="labelMedium" color={c.ink2}>
                Your coach · knows your plan, meals and workouts
              </Text>
            </View>
          </View>
        </View>
        {/* Today at a glance: what the coach sees, to spark a question. */}
        {stats.length > 0 && (
          <View style={styles.stats}>
            {stats.map((st, i) => (
              <Animated.View
                key={st.label}
                entering={reduce ? undefined : FadeInDown.delay(150 + i * 90).duration(320)}
                style={styles.stat}
              >
                <Text variant="bodyStrong" tabular>
                  {st.value}
                </Text>
                <Text variant="caption" color={c.ink2}>
                  {st.label}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}
        <View style={styles.chips}>
          {[
            { icon: Brain, text: "Remembers you" },
            { icon: BookOpen, text: "Science-based" },
            { icon: PenLine, text: "Logs for you" },
          ].map(({ icon: Icon, text }) => (
            <View key={text} style={styles.chip}>
              <Icon size={12} color={c.brandText} strokeWidth={2.4} />
              <Text variant="captionStrong" color={c.brandText} numberOfLines={1}>
                {text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="labelStrong" color={c.ink2}>
          Try asking
        </Text>
        {/* Questions from your own data, sliding in one after another. */}
        {suggestions.map((s, i) => (
          <Animated.View
            key={s}
            entering={
              reduce
                ? undefined
                : FadeInDown.delay(380 + i * 110)
                    .duration(360)
                    .springify()
                    .damping(16)
            }
          >
            <PressableScale accessibilityRole="button" onPress={() => onPick(s)} style={styles.suggestion}>
              <Sparkles size={14} color={c.brandText} strokeWidth={2.2} />
              <Text variant="bodyMedium" style={{ flexShrink: 1 }}>
                {s}
              </Text>
              <ArrowUpRight size={16} color={c.ink3} strokeWidth={2} absoluteStrokeWidth />
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Info size={14} color={fade(c.ink, 0.45)} strokeWidth={2} absoluteStrokeWidth style={{ marginTop: 1 }} />
        <Text variant="caption" color={fade(c.ink, 0.5)} style={{ flex: 1 }}>
          General guidance, not medical advice. If you’re injured, pregnant, have a medical condition or take
          medication, check with your doctor or physio.
        </Text>
      </View>
    </View>
  );
}

/** The "online" dot, softly breathing. */
function PulseDot({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + t.get() * 0.55,
    transform: [{ scale: 0.85 + t.get() * 0.3 }],
  }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, style]} />;
}

const useStyles = makeStyles((c, shadows) => ({
  premium: { gap: 14, padding: 20, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  hero: {
    gap: 14,
    padding: 18,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: c.surface,
    ...shadows.card,
  },
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.box,
    backgroundColor: c.ground,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: c.brandSoft,
  },
  suggestion: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: c.surface,
    ...shadows.card,
  },
}));
