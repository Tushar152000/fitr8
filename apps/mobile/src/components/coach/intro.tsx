import { ArrowUpRight, Crown, Info, Sparkle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { PillButton, PressableScale, Text } from "@/components/ui";
import { Glow } from "@/components/ui/glow";
import { PRIMARY_PILL } from "@/lib/gradients";
import { openPremium } from "@/lib/premium";
import { fade, makeStyles, useColors } from "@/lib/theme";

const SUGGESTIONS = [
  "How am I doing on protein today?",
  "What should I eat for dinner?",
  "How many sets a week to build muscle?",
  "Help me start running",
  "Why is my calorie target what it is?",
];

const ON_DARK_BODY = "rgba(255,255,255,0.75)";
const ON_DARK_SUBTLE = "rgba(255,255,255,0.55)";

/**
 * An empty chat (Figma "Your coach"): the Premium card (free plan), the dark "Coach intro" card with
 * its lime glow, "Try asking" pills that send at once, and the not-medical-advice note.
 */
export function Intro({ onPick, locked }: { onPick: (text: string) => void; locked: boolean }) {
  const c = useColors();
  const styles = useStyles();
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

      <View style={styles.hero}>
        <Glow tone="lime" opacity={0.7} left={6} bottom={-59} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LinearGradient {...PRIMARY_PILL} style={styles.avatar}>
            <Sparkle size={18} color={c.white} strokeWidth={2} absoluteStrokeWidth />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text variant="heading3" color={c.white}>
              Your fitness &amp; nutrition coach
            </Text>
            <Text variant="labelMedium" color={ON_DARK_SUBTLE}>
              Online · knows your plan
            </Text>
          </View>
        </View>
        <Text variant="bodySm" color={ON_DARK_BODY}>
          I know your goal, targets, meals, workouts and weight — and I remember what you tell me, like injuries or
          foods you avoid. I can also log water or a weigh-in for you.
        </Text>
        <View style={styles.chips}>
          {["Remembers you", "Science-based", "Logs for you"].map((t) => (
            <View key={t} style={styles.chip}>
              <Text
                variant="captionStrong"
                color={c.white}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {t}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="labelStrong" color={c.ink2}>
          Try asking
        </Text>
        {SUGGESTIONS.map((s) => (
          <PressableScale key={s} accessibilityRole="button" onPress={() => onPick(s)} style={styles.suggestion}>
            <Text variant="bodyMedium">{s}</Text>
            <ArrowUpRight size={16} color={c.ink3} strokeWidth={2} absoluteStrokeWidth />
          </PressableScale>
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

const useStyles = makeStyles((c, shadows) => ({
  premium: { gap: 14, padding: 20, borderRadius: 20, backgroundColor: c.surface, ...shadows.card },
  // Figma "Coach intro": inverse surface, always dark (white text in both themes).
  hero: {
    gap: 14,
    padding: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: c.panel,
    ...shadows.card,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  // Always one row (user decision 2026-11-27); a chip shrinks before anything wraps.
  chips: { flexDirection: "row", gap: 4 },
  chip: {
    flexShrink: 1,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: c.glassStrong,
    alignItems: "center",
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
