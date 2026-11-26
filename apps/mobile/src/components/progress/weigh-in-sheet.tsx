import type { CheckinDto } from "@fitr8/contracts";
import { useState } from "react";
import { View } from "react-native";
import { Sheet } from "@/components/sheet";
import { NumberField, PillButton, Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { dayMonth } from "@/lib/goal-details";
import { measurementsQuery, planQuery, progressQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { useColors } from "@/lib/theme";
import { showToast } from "@/lib/toast";

/** The weigh-in a check-in row stands for. */
export type WeighIn = { date: string; weightKg: number; label: string };

/** Weight, waist and body fat feed Progress, the plan, Measurements and Home's weight card. */
async function refreshAfterChange() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: progressQuery.queryKey }),
    queryClient.invalidateQueries({ queryKey: planQuery.queryKey }),
    queryClient.invalidateQueries({ queryKey: measurementsQuery.queryKey }),
    queryClient.invalidateQueries({ queryKey: ["day"] }),
  ]);
}

/**
 * Progress → a weekly check-in row: correct that day's weight (PATCH /api/checkins/:date) or delete
 * the weigh-in (DELETE; the day's other measurements stay). Delete asks once more in place.
 */
export function WeighInSheet({ weighIn, onClose }: { weighIn: WeighIn | null; onClose: () => void }) {
  return (
    <Sheet open={weighIn != null} onClose={onClose} title="Edit weigh-in">
      {weighIn && <WeighInForm key={weighIn.date} weighIn={weighIn} onDone={onClose} />}
    </Sheet>
  );
}

function WeighInForm({ weighIn, onDone }: { weighIn: WeighIn; onDone: () => void }) {
  const c = useColors();
  const [value, setValue] = useState(weighIn.weightKg.toFixed(1));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const path = `/api/checkins/${weighIn.date}`;

  async function save() {
    const kg = Number(value.replace(",", "."));
    if (!value.trim() || !Number.isFinite(kg) || kg < 30 || kg > 250)
      return setError("Enter weight between 30 and 250");
    setError(null);
    setBusy("save");
    try {
      await api<CheckinDto>(path, { method: "PATCH", json: { weightKg: Math.round(kg * 10) / 10 } });
      await refreshAfterChange();
      showToast("Weigh-in updated");
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Couldn't save. Try again."));
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirming) return setConfirming(true);
    setError(null);
    setBusy("delete");
    try {
      await api(path, { method: "DELETE" });
      await refreshAfterChange();
      showToast("Weigh-in deleted");
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Couldn't delete. Try again."));
      setBusy(null);
    }
  }

  return (
    <>
      <NumberField
        label={`Weight on ${dayMonth(weighIn.date)}`}
        unit="kg"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          if (error) setError(null);
        }}
        error={error ?? undefined}
        returnKeyType="done"
      />
      <View style={{ gap: 8 }}>
        <PillButton label="Save" onPress={save} loading={busy === "save"} disabled={busy === "delete"} />
        {confirming && (
          <Text variant="labelRegular" color={c.ink2} center>
            Only the weight goes; other measurements from that day stay.
          </Text>
        )}
        <PillButton
          label={confirming ? "Yes, delete this weigh-in" : "Delete weigh-in"}
          variant="link"
          onPress={remove}
          loading={busy === "delete"}
          disabled={busy === "save"}
          style={{ alignSelf: "center", paddingVertical: 12 }}
        />
      </View>
    </>
  );
}
