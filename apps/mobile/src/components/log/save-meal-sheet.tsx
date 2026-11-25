import { Check } from "lucide-react-native";
import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { Button, FieldError, Text } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import type { MealType } from "@/lib/format";
import type { Row } from "@/lib/meal-rows";
import { queryClient } from "@/lib/query";
import { savedMealsQuery } from "@/lib/queries";
import { toSavedPayload } from "@/lib/saved-meals";
import { useColors } from "@/lib/theme";
import { MealNameField } from "./meal-name-field";

/** "Save as a meal" on meal review: the items as they are now, under a name, for one-tap logging later. */
export function SaveMealSheet({
  open,
  onClose,
  onSaved,
  rows,
  ghee,
  mealType,
  suggestedName,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
  rows: Row[];
  ghee: boolean;
  mealType: MealType;
  suggestedName: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Save as a meal">
      {/* Remounts on every open, so the name starts from the current items. */}
      {open && <SaveMealForm {...{ onSaved, rows, ghee, mealType }} initialName={suggestedName} />}
    </Sheet>
  );
}

function SaveMealForm({
  onSaved,
  rows,
  ghee,
  mealType,
  initialName,
}: {
  onSaved: (name: string) => void;
  rows: Row[];
  ghee: boolean;
  mealType: MealType;
  initialName: string;
}) {
  const c = useColors();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setError("Give it a name, e.g. Usual breakfast");
    setBusy(true);
    setError(null);
    try {
      await api("/api/saved-meals", { json: toSavedPayload(name, mealType, rows, ghee) });
      track("saved_meal_created", { from: "meal" });
      await queryClient.invalidateQueries({ queryKey: savedMealsQuery.queryKey });
      onSaved(name.trim());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text color={c.ink2}>
        Next time, add these {rows.length} {rows.length === 1 ? "item" : "items"} with one tap from &quot;Type&quot; —
        no photo, no AI scan.
      </Text>
      <MealNameField
        autoFocus
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        onSubmitEditing={save}
        placeholder="e.g. Usual breakfast"
      />
      {error && <FieldError>{error}</FieldError>}
      <Button icon={Check} onPress={save} loading={busy}>
        Save meal
      </Button>
    </>
  );
}
