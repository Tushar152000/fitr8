import type { TrainingDayDto } from "@fitr8/contracts";
import { useState } from "react";
import { View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Button, FieldError, NumberField, Text } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { handlePremiumError } from "@/lib/premium";
import { useColors } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { logSession } from "@/lib/training";

/** "I already ran · log it": duration and, for runs and rides, an optional distance. */
export function LogSheet({ open, onClose, day }: { open: boolean; onClose: () => void; day: TrainingDayDto }) {
  const c = useColors();
  const last = day.logs[0];
  const [minutes, setMinutes] = useState(String(last?.minutes ?? (day.minutes || 30)));
  const [km, setKm] = useState(last?.distanceKm ? String(last.distanceKm) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withDistance = day.type === "run" || day.type === "hiit" || day.type === "cycle";

  async function save() {
    const m = Math.round(Number(minutes.replace(",", ".")));
    const d = km.trim() ? Number(km.replace(",", ".")) : undefined;
    if (!Number.isFinite(m) || m < 1 || m > 300) return setError("Enter 1 to 300 minutes.");
    if (d !== undefined && (!Number.isFinite(d) || d < 0.1 || d > 200))
      return setError("Enter a distance from 0.1 to 200 km, or leave it empty.");
    setBusy(true);
    setError(null);
    try {
      await logSession(day, m, d);
      showToast("Session logged");
      onClose();
    } catch (e) {
      if (!handlePremiumError(e)) setError(errorMessage(e, "Couldn't log it. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Log ${day.title.toLowerCase()}`}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <NumberField label="How long" unit="min" value={minutes} onValueChange={setMinutes} />
          {withDistance && <NumberField label="Distance (optional)" unit="km" value={km} onValueChange={setKm} />}
        </View>
        {withDistance && (
          <Text variant="labelRegular" color={c.ink2}>
            With a distance, your easy pace adjusts after 2 logged runs.
          </Text>
        )}
        {error && <FieldError>{error}</FieldError>}
        <Button onPress={save} loading={busy}>
          Log it
        </Button>
      </View>
    </Sheet>
  );
}
