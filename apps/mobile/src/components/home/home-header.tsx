import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Crown } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Avatar, MovingGradient, PressableScale, Text } from "@/components/ui";
import { PRIMARY_PILL } from "@/lib/gradients";
import { openPaywall } from "@/lib/premium";
import { dotState, isPersonalBest, streakAtRisk, streakQuery } from "@/lib/streak";
import { makeStyles, useColors } from "@/lib/theme";
import type { Me } from "@/lib/types";
import { StreakCelebration } from "./streak-celebration";
import { StreakFlame } from "./streak-flame";
import { StreakSheet } from "./streak-sheet";

/**
 * Figma "Profile header" (Home): avatar (→ Profile) with a crown badge for Premium users, "Go Premium"
 * for free users, and the streak pill on the right (→ streak sheet): flame, count and this week's
 * seven days as dots under it (logged filled, today ringed, missed hollow; user request 2026-11-28).
 * No date or greeting.
 */
export function HomeHeader({ me }: { me: Pick<Me, "name" | "image" | "plan"> }) {
  const c = useColors();
  const styles = useStyles();
  const [sheet, setSheet] = useState(false);
  const streak = useQuery(streakQuery);
  const premium = me.plan === "PRO";
  const count = streak.data?.current;
  // After 8 pm with nothing logged today, the flame dims (evening nudge).
  const atRisk = streak.data ? streakAtRisk(streak.data) : false;

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={premium ? "Profile and settings. FITR8 Premium" : "Profile and settings"}
          onPress={() => router.push("/profile")}
          hitSlop={6}
        >
          <View>
            {/* An even ring in the page's surface colour (white in light, dark grey in dark). */}
            <View style={styles.ring}>
              <Avatar name={me.name} image={me.image} variant="primary" size={48} />
            </View>
            {/* Premium: a crown badge on the photo instead of a text pill. */}
            {premium && (
              <LinearGradient {...PRIMARY_PILL} style={styles.crown}>
                <Crown size={11} color={c.highlight} strokeWidth={2.4} fill={c.highlight} />
              </LinearGradient>
            )}
          </View>
        </PressableScale>
        {!premium && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Go Premium"
            onPress={() => openPaywall("home_header")}
            style={styles.premium}
          >
            <View style={styles.premiumFill}>
              <MovingGradient />
              <Crown size={14} color={c.highlight} fill={c.highlight} strokeWidth={2.2} />
              <Text variant="labelStrong" color={c.white}>
                Go Premium
              </Text>
            </View>
          </PressableScale>
        )}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          count == null ? "Streak" : count === 0 ? "No streak yet. Open streak" : `${streakLabel(count)}. Open streak`
        }
        onPress={() => setSheet(true)}
        style={styles.streak}
      >
        <View style={atRisk ? { opacity: 0.5 } : undefined}>
          <StreakFlame
            lit={(count ?? 0) > 0 && !atRisk}
            best={!atRisk && streak.data ? isPersonalBest(streak.data) : false}
          />
        </View>
        <View style={{ gap: 4 }}>
          <View style={styles.countRow}>
            {count === 0 ? (
              <Text variant="labelMedium" color={c.ink2}>
                Start a streak
              </Text>
            ) : (
              <>
                <Text variant="bodyStrong" tabular>
                  {count ?? "–"}
                </Text>
                <Text variant="labelMedium" color={c.ink2}>
                  day streak
                </Text>
              </>
            )}
          </View>
          {streak.data && (
            <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {streak.data.week.map((d) => (
                <WeekPip key={d.date} state={dotState(d.state)} />
              ))}
            </View>
          )}
        </View>
      </PressableScale>
      <StreakSheet open={sheet} onClose={() => setSheet(false)} />
      <StreakCelebration />
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  ring: { width: 52, height: 52, borderRadius: 26, padding: 2, backgroundColor: c.surface, ...shadows.card },
  // Sits on the avatar's top-right edge, tilted like a crown worn at an angle.
  crown: {
    position: "absolute",
    top: -5,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "18deg" }],
  },
  premium: { borderRadius: 100, overflow: "hidden" },
  // 40 px tall: sits balanced next to the 52 px avatar ring.
  premiumFill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 100,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  countRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  week: { flexDirection: "row", gap: 4 },
  pip: { width: 7, height: 7, borderRadius: 3.5 },
}));

/** One day of this week under the streak count: logged = olive dot, today = olive ring, missed = grey ring, later = faint dot. */
function WeekPip({ state }: { state: ReturnType<typeof dotState> }) {
  const c = useColors();
  const styles = useStyles();
  const look =
    state === "logged"
      ? { backgroundColor: c.brand }
      : state === "today"
        ? { borderWidth: 1.5, borderColor: c.brand }
        : state === "missed"
          ? { borderWidth: 1.5, borderColor: c.lineStrong }
          : { backgroundColor: c.track };
  return <View style={[styles.pip, look]} />;
}

/** "1 day streak", "5 day streak" (spoken label). */
const streakLabel = (n: number) => `${n} day streak`;
