import type { LabelScanDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { LabelCheck } from "@/components/log/label/label-check";
import { Per100gFields } from "@/components/log/label/per-100g-fields";
import { MealWhen } from "@/components/log/meal-when";
import { TotalCard } from "@/components/log/total-card";
import { QueryError } from "@/components/query-error";
import { ProductSkeleton } from "@/components/skeletons";
import { Button, Card, FieldError, FormField, NumberField, Screen, Stepper, Text, TextField } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { formatInt, MEAL_LABEL } from "@/lib/format";
import { labelAddsUp } from "@/lib/label";
import { useMealChoice } from "@/lib/meal-param";
import { refreshDay } from "@/lib/query";
import { useColors } from "@/lib/theme";
import { showDay } from "@/lib/view-day";
import { haptic } from "@/lib/haptics";

type ScanDto = LabelScanDto;

const str = (n: number | null) => (n == null ? "" : String(Math.round(n * 10) / 10));
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

/** Screen 7g: check the values the AI read, then save the food and add it to the meal. */
export default function CheckLabelScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const scan = useQuery({
    queryKey: ["label", params.id],
    queryFn: () => api<ScanDto>(`/api/foods/label/${params.id}`),
  });
  if (scan.isPending) {
    return (
      <Screen>
        <BackHeader />
        <ProductSkeleton />
      </Screen>
    );
  }
  if (scan.isError) {
    return (
      <Screen>
        <BackHeader />
        <QueryError error={scan.error} onRetry={() => scan.refetch()} />
      </Screen>
    );
  }
  return <CheckLabel scan={scan.data} />;
}

function CheckLabel({ scan }: { scan: ScanDto }) {
  const c = useColors();
  const { mealType, setMealType, date, dateBody, params } = useMealChoice();
  const [name, setName] = useState(scan.name);
  const [kcal, setKcal] = useState(str(scan.per100g.kcal));
  const [protein, setProtein] = useState(str(scan.per100g.protein));
  const [carbs, setCarbs] = useState(str(scan.per100g.carbs));
  const [fat, setFat] = useState(str(scan.per100g.fat));
  const [serving, setServing] = useState(str(scan.servingSizeG ?? 100));
  const [servings, setServings] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = { kcal: num(kcal), protein: num(protein), carbs: num(carbs), fat: num(fat) };
  const allNumbers = Object.values(values).every((v) => Number.isFinite(v) && v >= 0);
  const check = allNumbers ? labelAddsUp(values) : null;
  const servingG = num(serving);
  const grams = Number.isFinite(servingG) && servingG > 0 ? servingG * servings : 0;
  // The API takes at most 100 servings and 5000 g per item: the stepper stops there.
  const maxServings =
    Number.isFinite(servingG) && servingG > 0
      ? Math.max(0.5, Math.min(100, Math.floor((5000 / servingG) * 2) / 2))
      : 100;
  const total = allNumbers ? (values.kcal * grams) / 100 : 0;
  const canSave = allNumbers && grams > 0 && name.trim().length >= 2;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/foods/label/${scan.id}/save`, {
        json: {
          name: name.trim(),
          per100g: values,
          servingSizeG: servingG,
          servingLabel: scan.servingLabel ?? undefined,
          quantity: servings,
          unit: "serving",
          grams,
          mealType,
          isLiquid: false,
          ...dateBody,
        },
      });
      track("meal_logged", { method: "label" });
      haptic.success();
      refreshDay();
      showDay(date);
      router.dismissTo("/today");
    } catch (e) {
      setError(errorMessage(e, "Couldn't save. Try again."));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <TotalCard kcal={total} live>
            <Text weight={600} size={13} color={c.ink3} tabular>
              {formatInt(grams)} g
            </Text>
          </TotalCard>
          {error && <FieldError>{error}</FieldError>}
          <Button onPress={save} loading={busy} disabled={!canSave}>
            {`Save and add to ${MEAL_LABEL[mealType].toLowerCase()}`}
          </Button>
        </>
      }
    >
      <BackHeader onBack={() => router.replace({ pathname: "/log/label", params })} />
      <View style={{ gap: 4 }}>
        <Text variant="h1" size={26}>
          Check the label values
        </Text>
        <Text color={c.ink2}>We read these per 100 g. Fix anything that doesn&apos;t match the pack.</Text>
      </View>

      <View style={{ gap: 16 }}>
        <FormField label="Product name" gap={6}>
          <TextField
            accessibilityLabel="Product name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Parle-G Gold"
          />
        </FormField>

        {check && <LabelCheck ok={check.ok} fromMacros={check.fromMacros} kcal={values.kcal} />}

        <Per100gFields
          fields={[
            { label: "Energy", unit: "kcal", value: kcal, onChange: setKcal },
            { label: "Protein", unit: "g", value: protein, onChange: setProtein },
            { label: "Carbs", unit: "g", value: carbs, onChange: setCarbs },
            { label: "Fat", unit: "g", value: fat, onChange: setFat },
          ]}
        />

        <Card>
          <NumberField
            label="Serving size"
            unit="g"
            value={serving}
            onValueChange={setServing}
            hint={scan.servingLabel ? `Label says: ${scan.servingLabel}` : undefined}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text weight={600}>Servings</Text>
            <Stepper label="Servings" value={servings} step={0.5} min={0.5} max={maxServings} onChange={setServings} />
          </View>
        </Card>

        <MealWhen mealType={mealType} onMealType={setMealType} date={date} />
      </View>
    </Screen>
  );
}
