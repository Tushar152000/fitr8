import type { SavedMealDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { AddItemSheet } from "@/components/log/add-item-sheet";
import { MealItemList } from "@/components/log/meal-item-list";
import { MealNameField } from "@/components/log/meal-name-field";
import { FormSkeleton } from "@/components/skeletons";
import { Button, Card, Chip, FieldError, FormField, PressableScale, Screen, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, ApiError, errorMessage } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { formatInt, MEAL_LABEL, MEAL_TYPES, type MealType } from "@/lib/format";
import { mealFromParam } from "@/lib/meal-param";
import { totals, type Row } from "@/lib/meal-rows";
import { savedMealsQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { rowsFromSaved, toSavedPayload } from "@/lib/saved-meals";
import { useColors } from "@/lib/theme";

/** Build or edit a saved meal: a name, an optional usual slot, and the items. `id` is "new" to create. */
export default function SavedMealRoute() {
  const c = useColors();
  const { id, meal } = useLocalSearchParams<{ id: string; meal?: string }>();
  const creating = id === "new";
  const list = useQuery({ ...savedMealsQuery, enabled: !creating });

  if (!creating && list.isPending) {
    return (
      <Screen>
        <BackHeader />
        <FormSkeleton />
      </Screen>
    );
  }
  const existing = creating ? null : (list.data?.find((m) => m.id === id) ?? null);
  if (!creating && !existing) {
    return (
      <Screen>
        <BackHeader />
        <View style={{ gap: 8, marginTop: 24 }}>
          <Text variant="h1">Saved meal not found</Text>
          <Text color={c.ink2}>It may have been deleted on another device.</Text>
        </View>
      </Screen>
    );
  }
  return <Builder existing={existing} defaultMeal={mealFromParam(meal)} />;
}

function Builder({ existing, defaultMeal }: { existing: SavedMealDto | null; defaultMeal: MealType | null }) {
  const c = useColors();
  const [name, setName] = useState(existing?.name ?? "");
  const [mealType, setMealType] = useState<MealType | null>(existing ? existing.mealType : defaultMeal);
  const [rows, setRows] = useState<Row[]>(() => (existing ? rowsFromSaved(existing) : []));
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sum = totals(rows, false);

  async function save() {
    if (!name.trim()) {
      setNameError("Give it a name, e.g. Usual breakfast");
      return;
    }
    if (!rows.length) {
      setError("Add at least one item.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = toSavedPayload(name, mealType, rows);
      if (existing) await api(`/api/saved-meals/${existing.id}`, { method: "PUT", json: body });
      else {
        await api("/api/saved-meals", { json: body });
        track("saved_meal_created", { from: "builder" });
      }
      await queryClient.invalidateQueries({ queryKey: savedMealsQuery.queryKey });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!(await confirmAction(`Delete "${existing.name}"?`, "Meals you already logged stay as they are.", "Delete")))
      return;
    try {
      await api(`/api/saved-meals/${existing.id}`, { method: "DELETE" });
      queryClient.setQueryData(savedMealsQuery.queryKey, (old: SavedMealDto[] | undefined) =>
        old?.filter((m) => m.id !== existing.id),
      );
      void queryClient.invalidateQueries({ queryKey: savedMealsQuery.queryKey });
      router.back();
    } catch (e) {
      setError(errorMessage(e, "Couldn't delete. Try again."));
    }
  }

  return (
    <Screen
      footer={
        <>
          <View style={styles.total}>
            <View>
              <Text weight={600} size={12} color={c.ink3}>
                Total
              </Text>
              <Text variant="h1" size={26} tabular accessibilityLiveRegion="polite">
                {formatInt(sum.kcal)}{" "}
                <Text weight={600} size={13} color={c.ink3}>
                  kcal
                </Text>
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text weight={600} size={13} color={c.protein} tabular>
                {formatInt(sum.proteinG)} g protein
              </Text>
              <Text weight={600} size={13} color={c.carbsText} tabular>
                {formatInt(sum.carbsG)} g carbs · {formatInt(sum.fatG)} g fat
              </Text>
            </View>
          </View>
          {error && <FieldError>{error}</FieldError>}
          <Button onPress={save} loading={busy} disabled={rows.length === 0}>
            {existing ? "Save changes" : "Save meal"}
          </Button>
        </>
      }
    >
      <BackHeader>
        {existing && (
          <PressableScale
            accessibilityRole="button"
            onPress={remove}
            style={[styles.delete, { alignSelf: "flex-end" }]}
            hitSlop={6}
          >
            <Trash2 size={16} color={c.ink3} />
            <Text weight={600} size={13} color={c.ink3}>
              Delete
            </Text>
          </PressableScale>
        )}
      </BackHeader>

      <View style={{ gap: 6 }}>
        <Text variant="h1">{existing ? "Edit saved meal" : "New saved meal"}</Text>
        <Text color={c.ink2}>
          Save a meal you eat often. Next time it&apos;s one tap to log — no photo, no AI scan.
        </Text>
      </View>

      <FormField label="Name" error={nameError} gap={8}>
        <MealNameField
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(null);
          }}
          placeholder="e.g. Usual breakfast, Post-workout shake"
        />
      </FormField>

      <FormField label="Usually for (optional)" gap={8}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityLabel="Usually for">
          {MEAL_TYPES.map((t) => (
            <Chip key={t} selected={t === mealType} onPress={() => setMealType(t === mealType ? null : t)}>
              {MEAL_LABEL[t]}
            </Chip>
          ))}
        </View>
      </FormField>

      <View style={{ gap: 10 }}>
        <Text variant="h2">Items</Text>
        {rows.length === 0 && (
          <Card>
            <Text color={c.ink2}>
              Search the food list, or describe it (&quot;2 roti and 1 katori dal&quot;) and we&apos;ll work out the
              numbers.
            </Text>
          </Card>
        )}
        <MealItemList rows={rows} onRowsChange={setRows} />
        <Button variant="dashed" icon={Plus} onPress={() => setAddOpen(true)}>
          {rows.length ? "Add another item" : "Add an item"}
        </Button>
      </View>

      <AddItemSheet
        open={addOpen}
        mealType={mealType ?? "SNACK"}
        onClose={() => setAddOpen(false)}
        onAdd={(added) => {
          setRows((all) => [...all, ...added]);
          setAddOpen(false);
          setError(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  delete: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: 4 },
});
