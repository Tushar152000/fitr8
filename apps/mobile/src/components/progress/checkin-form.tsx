import { useState } from "react";
import { View } from "react-native";
import { Button, Card, FieldError, NumberField, Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { useColors } from "@/lib/theme";

/** The weekly check-in card on Progress: weight and an optional waist, the last ones as placeholders. */
export function CheckinForm({
  lastWeightKg,
  lastWaistCm,
}: {
  lastWeightKg: number | null;
  lastWaistCm: number | null;
}) {
  const c = useColors();
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [errors, setErrors] = useState<{ weight?: string; waist?: string }>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  async function submit() {
    const w = Number(weight);
    const wc = waist.trim() ? Number(waist) : undefined;
    const next: typeof errors = {};
    if (!weight.trim() || !Number.isFinite(w) || w < 30 || w > 250) next.weight = "Enter weight between 30 and 250";
    if (wc !== undefined && (!Number.isFinite(wc) || wc < 40 || wc > 200))
      next.waist = "Enter waist between 40 and 200";
    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus("saving");
    setServerError(null);
    try {
      await api("/api/checkins", { json: { weightKg: w, waistCm: wc } });
      setStatus("saved");
      setWeight("");
      setWaist("");
      // A new weight can change the plan's targets, which today and the plan screen show.
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["day"] });
    } catch (err) {
      setServerError(errorMessage(err, "Couldn't save. Try again."));
      setStatus("idle");
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <NumberField
          label="Weight"
          unit="kg"
          placeholder={lastWeightKg != null ? String(lastWeightKg) : "75"}
          value={weight}
          onValueChange={(v) => {
            setWeight(v);
            setStatus("idle");
          }}
          error={errors.weight}
        />
        <NumberField
          label="Waist (optional)"
          unit="cm"
          placeholder={lastWaistCm != null ? String(lastWaistCm) : "85"}
          value={waist}
          onValueChange={(v) => {
            setWaist(v);
            setStatus("idle");
          }}
          error={errors.waist}
        />
      </View>
      <Text size={13} color={c.ink3}>
        Weigh in the morning, after the loo, before food.
      </Text>
      {serverError && <FieldError>{serverError}</FieldError>}
      <Button variant="strong" onPress={submit} loading={status === "saving"}>
        {status === "saved" ? "Saved — thanks" : "Save check-in"}
      </Button>
    </Card>
  );
}
