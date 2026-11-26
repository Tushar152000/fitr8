import type { SavedMealDto, UsualDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { Bookmark, Pencil, Plus, Repeat } from "lucide-react-native";
import { View } from "react-native";
import { Button, IconTile, MenuGroup, PressableScale, SectionLabel, Text } from "@/components/ui";
import { formatInt, MEAL_LABEL, mealTitle, type MealType } from "@/lib/format";
import { makeStyles, useColors } from "@/lib/theme";

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
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <SectionLabel>Saved meals</SectionLabel>
        {meals.length > 0 && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="New saved meal"
            onPress={createNew}
            style={styles.link}
            hitSlop={6}
          >
            <Plus size={14} color={c.brandText} strokeWidth={2.4} />
            <Text variant="labelStrong" color={c.brandText}>
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
          <Hint>
            {mealType
              ? `One tap adds it to ${MEAL_LABEL[mealType].toLowerCase()}. No AI scan used.`
              : "One tap adds it to its usual meal, or pick one above. No AI scan used."}
          </Hint>
          <MenuGroup>
            {meals.map((m) => (
              <View key={m.id} style={[styles.row, busy !== null && { opacity: 0.6 }]}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${m.name}`}
                  onPress={() => onLog(m)}
                  disabled={busy !== null}
                  style={styles.rowMain}
                >
                  <IconTile icon={Bookmark} accent />
                  <RowText
                    title={m.name}
                    subtitle={`${formatInt(m.kcal)} kcal · ${m.proteinG} g protein · ${m.items.length} ${
                      m.items.length === 1 ? "item" : "items"
                    }${!mealChosen && m.mealType ? ` · ${MEAL_LABEL[m.mealType]}` : ""}`}
                  />
                  <AddLabel adding={busy === m.id} />
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${m.name}`}
                  onPress={() => router.push({ pathname: "/log/saved/[id]", params: { id: m.id } })}
                  disabled={busy !== null}
                  style={styles.edit}
                >
                  <Pencil size={16} color={c.ink2} strokeWidth={2} />
                </PressableScale>
              </View>
            ))}
          </MenuGroup>
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
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <SectionLabel>Your usuals</SectionLabel>
      <Hint>
        {mealType
          ? `One tap adds it to ${MEAL_LABEL[mealType].toLowerCase()}. No AI scan used.`
          : "Pick a meal above, then one tap adds it. No AI scan used."}
      </Hint>
      <MenuGroup>
        {usuals.map((u) => (
          <PressableScale
            key={u.mealId}
            accessibilityRole="button"
            onPress={() => onRelog(u)}
            disabled={busy !== null}
            style={[styles.row, busy !== null && { opacity: 0.6 }]}
          >
            <IconTile icon={Repeat} />
            <RowText
              title={mealTitle(u.names, "Meal")}
              subtitle={`${formatInt(u.kcal)} kcal · ${u.proteinG} g protein${u.count > 1 ? ` · logged ${u.count}×` : ""}`}
            />
            <AddLabel adding={busy === u.mealId} />
          </PressableScale>
        ))}
      </MenuGroup>
    </View>
  );
}

/** A Menu Row's text: title (Body/Strong) over the numbers (Label/Regular, secondary). */
function RowText({ title, subtitle }: { title: string; subtitle: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text variant="bodyStrong" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="labelRegular" color={c.ink2} tabular numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
}

function Hint({ children }: { children: string }) {
  const c = useColors();
  return (
    <Text variant="labelRegular" color={c.ink2}>
      {children}
    </Text>
  );
}

/** The row's trailing action: an accent pill, "Adding…" while it's logged. */
function AddLabel({ adding }: { adding: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.add}>
      <Text variant="labelStrong" color={c.brandText}>
        {adding ? "Adding…" : "Add"}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { gap: 10, marginTop: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 },
  link: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
  edit: { width: 40, height: 40, marginRight: -8, alignItems: "center", justifyContent: "center" },
  add: { borderRadius: 100, backgroundColor: c.brandSoft, paddingHorizontal: 12, paddingVertical: 6 },
}));
