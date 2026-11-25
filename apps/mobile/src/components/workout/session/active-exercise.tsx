import { Check, TrendingUp } from "lucide-react-native";
import { View } from "react-native";
import { Card, PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { repsLabel, roleLabel } from "@/lib/training";
import type { AdjustedExercise } from "@/lib/types";
import { SetInput } from "./set-input";

/** One set's entry in focus mode: kg and reps as typed, and whether it's ticked. */
export type SetState = { kg: string; reps: string; done: boolean };

/**
 * The exercise in focus (15b): its prescription, a row per set (kg, reps, tick) and the
 * progression hint, which becomes next time's target once every set is ticked.
 */
export function ActiveExercise({
  ex,
  index,
  total,
  doneCount,
  sets,
  saved,
  onChange,
  onToggle,
}: {
  ex: AdjustedExercise;
  index: number;
  total: number;
  doneCount: number;
  sets: SetState[];
  saved?: string;
  onChange: (i: number, patch: Partial<SetState>) => void;
  onToggle: (i: number) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const weighted = ex.targetKg != null;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text weight={600} size={12} color={c.ink3}>
            {roleLabel(ex.role)} · exercise {index + 1} of {total}
          </Text>
          <Text variant="h2" size={22}>
            {ex.name}
          </Text>
          <Text size={13} color={c.ink2} tabular>
            {ex.sets} × {repsLabel(ex)} · {ex.rir} reps in reserve · rest {Math.round((ex.restSec / 60) * 2) / 2} min
          </Text>
        </View>
        <View style={styles.badge}>
          <Text weight={700} size={12} tabular>
            {doneCount}/{total} done
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.setRow}>
          <Text weight={600} size={12} color={c.ink3} style={{ width: 32 }}>
            Set
          </Text>
          <Text weight={600} size={12} color={c.ink3} style={{ flex: 1 }}>
            {weighted ? "kg" : "Load"}
          </Text>
          <Text weight={600} size={12} color={c.ink3} style={{ flex: 1 }}>
            {ex.timed ? "Seconds" : "Reps"}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        {sets.map((s, i) => (
          <View key={i} style={styles.setRow}>
            <Text weight={700} tabular color={s.done ? c.ink3 : c.ink} style={{ width: 32 }}>
              {i + 1}
            </Text>
            <View style={{ flex: 1 }}>
              {weighted ? (
                <SetInput label={`Set ${i + 1} kg`} value={s.kg} onChange={(kg) => onChange(i, { kg })} />
              ) : (
                <Text weight={600} size={13} color={c.ink3}>
                  Bodyweight
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <SetInput
                label={`Set ${i + 1} ${ex.timed ? "seconds" : "reps"}`}
                value={s.reps}
                placeholder={repsLabel(ex)}
                onChange={(reps) => onChange(i, { reps })}
              />
            </View>
            <PressableScale
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              accessibilityLabel={`Set ${i + 1} done`}
              onPress={() => onToggle(i)}
              style={[styles.tick, { backgroundColor: s.done ? c.protein : c.sunken }]}
            >
              <Check size={20} strokeWidth={2.5} color={s.done ? c.surface : c.ink3} />
            </PressableScale>
          </View>
        ))}
      </View>
      {ex.bonusRep && (
        <Text weight={600} size={13} color={c.protein}>
          Feeling great: take one extra rep on your last set.
        </Text>
      )}
      <View style={styles.hint}>
        <TrendingUp size={16} color={c.protein} style={{ marginTop: 2 }} />
        <Text size={13} color={c.ink2} style={{ flex: 1 }}>
          {saved
            ? `Saved. Next time: ${saved}`
            : (ex.note ??
              `Stop each set with ${ex.rir} good reps left. Top the range on every set and the load goes up.`)}
        </Text>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  badge: { borderRadius: 999, backgroundColor: c.sunken, paddingHorizontal: 10, paddingVertical: 4 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tick: { width: 44, height: 44, borderRadius: radius.input, alignItems: "center", justifyContent: "center" },
  hint: { flexDirection: "row", gap: 8, borderRadius: radius.input, backgroundColor: c.proteinSoft, padding: 12 },
}));
