import type { MeasurementsDto, Sex } from "@fitr8/contracts";
import { Activity } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { FieldCell, FieldGrid } from "@/components/onboarding/field-grid";
import { Sheet } from "@/components/sheet";
import { FieldError, NumberField, PillButton, Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { EMPTY_DRAFT, MEASURE_FIELDS, readDraft, type EnteredKey, type MeasureDraft } from "@/lib/measurements";
import { measurementsQuery, planQuery, progressQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { makeStyles, useColors } from "@/lib/theme";
import { showToast } from "@/lib/toast";

/** Which field to start in; "bodyFat" starts in waist and highlights how body fat is worked out. */
export type MeasureFocus = EnteredKey | "bodyFat";

/**
 * "Add measurement": weight, waist, neck, chest, hips and arms, all optional (at least one). Saved
 * into today's row (POST /api/measurements); the server recalculates body fat from waist and neck.
 * The latest values show as placeholders.
 */
export function AddMeasurementSheet({
  open,
  focus,
  latest,
  sex,
  onClose,
}: {
  open: boolean;
  focus: MeasureFocus | null;
  latest: MeasurementsDto | undefined;
  sex: Sex | undefined;
  onClose: () => void;
}) {
  // A new form (empty, focused) each time it opens; the old one stays while the sheet slides away.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add measurement">
      <MeasureForm key={session} focus={focus} latest={latest} sex={sex} onDone={onClose} />
    </Sheet>
  );
}

function MeasureForm({
  focus,
  latest,
  sex,
  onDone,
}: {
  focus: MeasureFocus | null;
  latest: MeasurementsDto | undefined;
  sex: Sex | undefined;
  onDone: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const [draft, setDraft] = useState<MeasureDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<EnteredKey | "form", string>>>({});
  const [busy, setBusy] = useState(false);

  const start: EnteredKey = focus === "bodyFat" ? "waistCm" : (focus ?? "weightKg");
  const formula = sex === "FEMALE" ? "waist, neck and hips" : "waist and neck";

  async function save() {
    const read = readDraft(draft);
    if (!read.ok) return setErrors(read.errors);
    setErrors({});
    setBusy(true);
    try {
      const next = await api<MeasurementsDto>("/api/measurements", { json: read.body });
      queryClient.setQueryData(measurementsQuery.queryKey, next);
      // Weight and measurements feed the Progress trend and the plan's body basics.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: progressQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: planQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ["day"] }),
      ]);
      showToast("Measurements saved");
      onDone();
    } catch (e) {
      setErrors({ form: errorMessage(e, "Couldn't save. Try again.") });
      setBusy(false);
    }
  }

  return (
    <>
      <Text variant="bodySm" color={c.ink2}>
        Fill in what you measured today. Leave the rest empty.
      </Text>
      <FieldGrid>
        {MEASURE_FIELDS.map((f) => {
          const last = latest?.[f.key];
          return (
            <FieldCell key={f.key}>
              <NumberField
                label={f.label}
                unit={f.unit}
                value={draft[f.key]}
                onValueChange={(v) => {
                  setDraft((d) => ({ ...d, [f.key]: v }));
                  if (errors[f.key] || errors.form) setErrors((e) => ({ ...e, [f.key]: undefined, form: undefined }));
                }}
                placeholder={last ? String(last.value) : undefined}
                autoFocus={focus != null && f.key === start}
                error={errors[f.key]}
                returnKeyType="done"
              />
            </FieldCell>
          );
        })}
      </FieldGrid>
      <View style={[styles.note, focus === "bodyFat" && { backgroundColor: c.brandSoft }]}>
        <Activity size={16} color={focus === "bodyFat" ? c.brandText : c.ink2} strokeWidth={2} />
        <Text variant="labelMedium" color={c.ink} style={{ flex: 1, lineHeight: 18 }}>
          Body fat is calculated from {formula}.
        </Text>
      </View>
      {errors.form ? <FieldError>{errors.form}</FieldError> : null}
      <PillButton label="Save" onPress={save} loading={busy} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: c.ground,
    padding: 16,
  },
}));
