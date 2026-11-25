import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpRight, Crown, Info, Sparkles } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { COACH_HERO } from "@/lib/gradients";
import { openPremium } from "@/lib/premium";
import { makeStyles, radius, useColors } from "@/lib/theme";

const SUGGESTIONS = [
  "How am I doing on protein today?",
  "What should I eat for dinner?",
  "How many sets a week to build muscle?",
  "Help me start running",
  "Why is my calorie target what it is?",
];

/**
 * An empty chat: the Premium unlock card (free plan), the gradient hero saying what the coach
 * knows, "Try asking" pills that send at once, and the not-medical-advice note.
 */
export function Intro({ onPick, locked }: { onPick: (text: string) => void; locked: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 18 }}>
      {locked && (
        <Card dark style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Crown size={18} color={c.brandGlow} />
            <Text size={12} weight={700} color={c.brandGlow}>
              PREMIUM
            </Text>
          </View>
          <Text variant="h2" color={c.white}>
            Your coach is part of Premium
          </Text>
          <Text color="rgba(255,255,255,0.78)">
            Try it free for 7 days: answers made for your goal, meals and training, backed by sports science.
          </Text>
          <Button icon={Crown} onPress={() => openPremium("coach")}>
            Unlock the AI Coach
          </Button>
        </Card>
      )}

      <LinearGradient {...COACH_HERO} style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.heroIcon}>
            <Sparkles size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text weight={700} size={16} color="#ffffff">
              Your fitness &amp; nutrition coach
            </Text>
            <Text size={12} color="rgba(255,255,255,0.65)">
              Online · knows your plan
            </Text>
          </View>
        </View>
        <Text size={14} color="rgba(255,255,255,0.82)" style={{ lineHeight: 21 }}>
          I know your goal, targets, meals, workouts and weight, and I remember what you tell me, like injuries or foods
          you avoid. I can also log water or a weigh-in for you.
        </Text>
        <View style={styles.heroChips}>
          {["Remembers you", "Science-based", "Logs for you"].map((t) => (
            <View key={t} style={styles.heroChip}>
              <Text weight={600} size={11} color="#ffffff">
                {t}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        <Text weight={500} size={12} color={c.ink3}>
          Try asking
        </Text>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            onPress={() => onPick(s)}
            style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: c.sunken }]}
          >
            <Text weight={500} size={15}>
              {s}
            </Text>
            <ArrowUpRight size={16} color={c.ink3} />
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Info size={14} color={c.ink3} style={{ marginTop: 2 }} />
        <Text size={12} color={c.ink3} style={{ flex: 1, lineHeight: 17 }}>
          General guidance, not medical advice. If you&apos;re injured, pregnant, have a medical condition or take
          medication, check with your doctor or physio.
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { borderRadius: radius.card, padding: 18, gap: 14, overflow: "hidden" },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(113,139,0,0.4)", // accent/primary on the dark hero
    borderWidth: 1,
    borderColor: "rgba(194,224,74,0.45)", // accent/highlight
  },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  heroChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    justifyContent: "center",
    backgroundColor: c.glassStrong,
  },
  suggestion: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: c.surface,
  },
}));
