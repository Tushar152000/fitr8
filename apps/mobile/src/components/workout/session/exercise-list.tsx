import { Check, ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Section, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { repsLabel } from "@/lib/training";
import type { AdjustedExercise } from "@/lib/types";
import type { SetState } from "./active-exercise";

/** "Recommended exercises" (15b): every exercise in the session, done ones ticked; tap one to focus it. */
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
    <Section title="Recommended exercises" gap={8}>
      {exercises.map((e, i) => {
        const done = sets[i]?.every((s) => s.done);
        return (
          <PressableScale
            key={e.slug}
            accessibilityRole="button"
            accessibilityState={{ selected: i === active }}
            onPress={() => onSelect(i)}
            style={[styles.exercise, i === active && { borderColor: c.ink }]}
          >
            <View style={[styles.num, { backgroundColor: done ? c.protein : c.sunken }]}>
              {done ? (
                <Check size={16} color={c.surface} strokeWidth={3} accessibilityLabel="Done" />
              ) : (
                <Text weight={700} size={13} color={c.ink2}>
                  {i + 1}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight={600}>{e.name}</Text>
              <Text size={13} color={c.ink3} tabular>
                {e.sets} × {repsLabel(e)}
                {e.targetKg != null ? ` · ${e.targetKg} kg` : ""} · {e.rir} in reserve
              </Text>
            </View>
            <ChevronRight size={20} color={c.ink3} />
          </PressableScale>
        );
      })}
    </Section>
  );
}

const useStyles = makeStyles((c) => ({
  exercise: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
}));
