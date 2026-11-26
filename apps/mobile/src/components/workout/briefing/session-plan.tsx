import { View } from "react-native";
import { Text } from "@/components/ui";
import { fade, makeStyles, radius, useColors } from "@/lib/theme";
import { repsLabel, roleLabel } from "@/lib/training";
import type { TodayWorkout } from "@/lib/types";

/**
 * Briefing (10a) "Today": each exercise's prescription in the Workout tab's numbered list; sets
 * trimmed by the energy check show what they were.
 */
export function SessionPlan({ session }: { session: NonNullable<TodayWorkout["session"]> }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.head}>
        <Text variant="heading2" accessibilityRole="header" style={{ flex: 1 }}>
          Today
        </Text>
        <Text variant="labelMedium" color={c.ink2} tabular>
          ~{session.estimatedMinutes} min
        </Text>
      </View>
      <View style={styles.list}>
        {session.exercises.map((e, i) => {
          const trimmed = e.sets < e.plannedSets;
          return (
            <View key={e.slug} style={[styles.row, i < session.exercises.length - 1 && styles.divider]}>
              <View style={styles.badge}>
                <Text variant="captionStrong" color={fade(c.ink, 0.7)}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text variant="bodyStrong">{e.name}</Text>
                <Text variant="labelRegular" color={c.ink2}>
                  {roleLabel(e.role)} · {e.rir} in reserve{e.bonusRep ? " · +1 rep on last set" : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text variant="bodyStrong" tabular color={trimmed ? c.brandText : c.ink}>
                  {e.sets} × {repsLabel(e)}
                </Text>
                {trimmed && (
                  <Text variant="captionStrong" color={c.brandText}>
                    was {e.plannedSets} sets
                  </Text>
                )}
                {e.targetKg != null && (
                  <Text variant="labelMedium" color={c.ink2} tabular>
                    {e.targetKg} kg
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  head: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 56 },
  divider: { borderBottomWidth: 1, borderBottomColor: c.line },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
}));
