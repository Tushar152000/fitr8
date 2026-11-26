import { router } from "expo-router";
import { View } from "react-native";
import { Button, Text } from "@/components/ui";
import { weekdayName } from "@/lib/dates";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { repsLabel } from "@/lib/training";
import type { TodayWorkout } from "@/lib/types";

/** Focus mode on a rest day (15b): today's cardio, a look at the next session, and the briefing. */
export function RestDay({ data }: { data: TodayWorkout }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <>
      <View style={styles.card}>
        <Text variant="bodySm" color={c.ink2}>
          {data.cardio}
        </Text>
      </View>
      {data.nextDay && (
        <View style={{ gap: 10 }}>
          <Text variant="heading2" accessibilityRole="header">
            Next: {data.nextDay.name}, {weekdayName(data.nextDay.date)}
          </Text>
          <View style={styles.list}>
            {data.nextDay.exercises.map((e, i, all) => (
              <View key={e.slug} style={[styles.row, i < all.length - 1 && styles.divider]}>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {e.name}
                </Text>
                <Text variant="labelMedium" color={c.ink2} tabular>
                  {e.sets} × {repsLabel(e)}
                  {e.targetKg != null ? ` · ${e.targetKg} kg` : ""}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Button variant="secondary" onPress={() => router.push("/briefing")}>
        Coach briefing
      </Button>
    </>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 48 },
  divider: { borderBottomWidth: 1, borderBottomColor: c.line },
}));
