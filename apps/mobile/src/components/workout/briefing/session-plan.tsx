import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { repsLabel, roleLabel } from "@/lib/training";
import type { TodayWorkout } from "@/lib/types";

/** Briefing (10a) "Today": each exercise's prescription; sets trimmed by the energy check show what they were. */
export function SessionPlan({ session }: { session: NonNullable<TodayWorkout["session"]> }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text variant="h2">Today</Text>
        <Text variant="meta" tabular>
          ~{session.estimatedMinutes} min
        </Text>
      </View>
      <View style={styles.list}>
        {session.exercises.map((e, i) => {
          const trimmed = e.sets < e.plannedSets;
          return (
            <View key={e.slug} style={[styles.item, i > 0 && styles.divider]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text weight={600}>{e.name}</Text>
                <Text weight={600} size={12} color={c.ink3}>
                  {roleLabel(e.role)} · {e.rir} in reserve{e.bonusRep ? " · +1 rep on last set" : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text weight={600} tabular color={trimmed ? c.protein : c.ink}>
                  {e.sets} × {repsLabel(e)}
                </Text>
                {trimmed && (
                  <Text weight={600} size={12} color={c.protein}>
                    was {e.plannedSets} sets
                  </Text>
                )}
                {e.targetKg != null && (
                  <Text weight={500} size={13} color={c.ink3} tabular>
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

const useStyles = makeStyles((c) => ({
  list: { borderRadius: radius.card, backgroundColor: c.surface },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
}));
