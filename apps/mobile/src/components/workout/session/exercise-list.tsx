import { Check, ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { repsLabel } from "@/lib/training";
import type { AdjustedExercise } from "@/lib/types";
import type { SetState } from "./active-exercise";

/**
 * "Recommended exercises" (15b): every exercise in the session on one white card (the Workout
 * tab's numbered list), done ones ticked, the one in focus with an ink number; tap one to focus it.
 */
export function ExerciseList({
  exercises,
  sets,
  active,
  onSelect,
}: {
  exercises: AdjustedExercise[];
  sets: SetState[][];
  active: number;
  onSelect: (i: number) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 10 }}>
      <Text variant="heading2" accessibilityRole="header">
        Recommended exercises
      </Text>
      <View style={styles.list}>
        {exercises.map((e, i) => {
          const done = sets[i]?.every((s) => s.done);
          const current = i === active;
          return (
            <PressableScale
              key={e.slug}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              onPress={() => onSelect(i)}
              style={[styles.row, i < exercises.length - 1 && styles.divider]}
            >
              <View style={[styles.num, done ? styles.numDone : current ? styles.numActive : null]}>
                {done ? (
                  <Check size={14} color={c.white} strokeWidth={3} accessibilityLabel="Done" />
                ) : (
                  <Text variant="captionStrong" color={current ? c.onStrong : c.ink2}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {e.name}
                </Text>
                <Text variant="labelRegular" color={c.ink2} tabular numberOfLines={1}>
                  {e.sets} × {repsLabel(e)}
                  {e.targetKg != null ? ` · ${e.targetKg} kg` : ""} · {e.rir} in reserve
                </Text>
              </View>
              <ChevronRight size={18} color={c.ink2} strokeWidth={2} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  list: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 56 },
  divider: { borderBottomWidth: 1, borderBottomColor: c.line },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  numActive: { backgroundColor: c.strong },
  numDone: { backgroundColor: c.brand },
}));
