import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Crown } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Avatar, PressableScale, Text } from "@/components/ui";
import { PRIMARY_PILL } from "@/lib/gradients";
import { openPaywall } from "@/lib/premium";
import { isPersonalBest, streakQuery } from "@/lib/streak";
import { makeStyles, useColors } from "@/lib/theme";
import type { Me } from "@/lib/types";
import { StreakFlame } from "./streak-flame";
import { StreakSheet } from "./streak-sheet";

/**
 * Figma "Profile header" (Home): avatar (→ Profile), "Go Premium" for free users or the Premium pill
 * for Premium users, and the streak pill on the right (→ streak sheet). No date or greeting.
 */
export function HomeHeader({ me }: { me: Pick<Me, "name" | "image" | "plan"> }) {
  const c = useColors();
  const styles = useStyles();
  const [sheet, setSheet] = useState(false);
  const streak = useQuery(streakQuery);
  const premium = me.plan === "PRO";
  const count = streak.data?.current;

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
          onPress={() => router.push("/profile")}
          hitSlop={6}
        >
          <Avatar name={me.name} image={me.image} variant="primary" size={44} style={styles.avatar} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={premium ? "FITR8 Premium" : "Go Premium"}
          onPress={() => openPaywall("home_header")}
          style={styles.premium}
        >
          <LinearGradient {...PRIMARY_PILL} style={styles.premiumFill}>
            {premium && <Crown size={14} color={c.highlight} strokeWidth={2.2} />}
            <Text variant="labelStrong" color={c.white}>
              {premium ? "Premium" : "Go Premium"}
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={count != null ? `${count} day streak. Open streak` : "Streak"}
        onPress={() => setSheet(true)}
        style={styles.streak}
      >
        <StreakFlame lit={streak.data ? isPersonalBest(streak.data) : false} />
        <Text variant="bodyStrong" tabular>
          {count ?? "–"}
        </Text>
        <Text variant="labelMedium" color={c.ink2}>
          day streak
        </Text>
      </PressableScale>
      <StreakSheet open={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  avatar: { borderWidth: 2, borderColor: c.white },
  premium: { borderRadius: 100, overflow: "hidden" },
  premiumFill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
    borderRadius: 100,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: c.surface,
    ...shadows.card,
  },
}));
