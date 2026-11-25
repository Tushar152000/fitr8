import type { SavedMealDto, UsualDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { Bookmark, ChevronRight, Pencil, Plus, Repeat } from "lucide-react-native";
import { View } from "react-native";
import { Button, PressableScale, Text } from "@/components/ui";
import { formatInt, MEAL_LABEL, mealTitle, type MealType } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Design 7b "Saved meals": one tap logs a saved meal, the pencil edits it, "New" builds one. */
export function SavedMealsSection({
  meals,
  busy,
  mealType,
  mealChosen,
  params,
  onLog,
}: {
  meals: SavedMealDto[];
  /** What's being added right now (a saved meal's id), or another action's key; null when idle. */
  busy: string | null;
  mealType: MealType;
  /** The meal was picked (route or user), so a saved meal's own slot isn't shown. */
  mealChosen: boolean;
  /** The meal and day picked so far, carried to the builder. */
  params: { meal?: string; date?: string };
  onLog: (meal: SavedMealDto) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const createNew = () => router.push({ pathname: "/log/saved/[id]", params: { id: "new", ...params } });
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <View style={styles.sectionHead}>
        <Text variant="h2">Saved meals</Text>
        {meals.length > 0 && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="New saved meal"
            onPress={createNew}
            style={styles.link}
            hitSlop={6}
          >
            <Plus size={16} color={c.brandText} />
            <Text weight={600} size={14} color={c.brandText}>
              New
            </Text>
          </PressableScale>
        )}
      </View>
      {meals.length === 0 ? (
        <Button variant="dashed" icon={Bookmark} onPress={createNew}>
          Save a meal you eat often
        </Button>
      ) : (
        <>
          <Text size={13} color={c.ink3}>
            {mealType
              ? `One tap adds it to ${MEAL_LABEL[mealType].toLowerCase()}. No AI scan used.`
              : "One tap adds it to its usual meal, or pick one above. No AI scan used."}
          </Text>
          {meals.map((m) => (
            <View key={m.id} style={[styles.row, busy !== null && { opacity: 0.6 }]}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Add ${m.name}`}
                onPress={() => onLog(m)}
                disabled={busy !== null}
                style={styles.rowMain}
              >
                <View style={[styles.icon, { backgroundColor: c.proteinSoft }]}>
                  <Bookmark size={20} color={c.protein} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight={600} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text size={13} color={c.ink3} tabular numberOfLines={1}>
                    {formatInt(m.kcal)} kcal · {m.proteinG} g protein · {m.items.length}{" "}
                    {m.items.length === 1 ? "item" : "items"}
                    {!mealChosen && m.mealType ? ` · ${MEAL_LABEL[m.mealType]}` : ""}
                  </Text>
                </View>
                <AddLabel adding={busy === m.id} />
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Edit ${m.name}`}
                onPress={() => router.push({ pathname: "/log/saved/[id]", params: { id: m.id } })}
                disabled={busy !== null}
                style={styles.edit}
              >
                <Pencil size={18} color={c.ink3} />
              </PressableScale>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/** Design 7b "Your usuals": meals the user logs often; one tap logs one again. */
export function UsualsSection({
  usuals,
  busy,
  mealType,
  onRelog,
}: {
  usuals: UsualDto[];
  /** What's being added right now (a usual's mealId), or another action's key; null when idle. */
  busy: string | null;
  mealType: MealType;
  onRelog: (usual: UsualDto) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <Text variant="h2">Your usuals</Text>
      <Text size={13} color={c.ink3}>
        {mealType
          ? `One tap adds it to ${MEAL_LABEL[mealType].toLowerCase()}. No AI scan used.`
          : "Pick a meal above, then one tap adds it. No AI scan used."}
      </Text>
      {usuals.map((u) => (
        <PressableScale
          key={u.mealId}
          accessibilityRole="button"
          onPress={() => onRelog(u)}
          disabled={busy !== null}
          style={[styles.row, busy !== null && { opacity: 0.6 }]}
        >
          <View style={styles.icon}>
            <Repeat size={20} color={c.ink2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight={600} numberOfLines={1}>
              {mealTitle(u.names, "Meal")}
            </Text>
            <Text size={13} color={c.ink3} tabular>
              {formatInt(u.kcal)} kcal · {u.proteinG} g protein{u.count > 1 ? ` · logged ${u.count}×` : ""}
            </Text>
          </View>
          <AddLabel adding={busy === u.mealId} />
          <ChevronRight size={20} color={c.ink3} />
        </PressableScale>
      ))}
    </View>
  );
}

function AddLabel({ adding }: { adding: boolean }) {
  const c = useColors();
  return (
    <Text weight={600} size={13} color={c.brandText}>
      {adding ? "Adding…" : "Add"}
    </Text>
  );
}

const useStyles = makeStyles((c) => ({
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: 4 },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
  edit: { width: 44, height: 44, marginRight: -8, alignItems: "center", justifyContent: "center" },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
}));
