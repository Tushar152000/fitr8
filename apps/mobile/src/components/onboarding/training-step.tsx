import { ChipGroup, FieldError, FormField, Text, TextField } from "@/components/ui";
import { MEDICAL_NOTE_MAX } from "@/lib/onboarding-draft";
import { makeStyles, useColors } from "@/lib/theme";
import { MedicalCheck } from "./medical-check";
import { DaysPerWeekField, EquipmentField, InjuriesField, SessionMinutesField } from "./routine-fields";
import type { StepProps } from "./step-props";

/** "Food and training", the second part of "About you": diet, routine, injuries and the health flag. */
export function TrainingStep({ draft, set, errors }: StepProps) {
  const c = useColors();
  const styles = useStyles();
  return (
    <>
      <FormField label="Diet" error={errors.dietType}>
        <ChipGroup
          label="Diet"
          value={draft.dietType}
          onChange={(v) => set("dietType", v)}
          options={[
            { value: "VEG", label: "Veg" },
            { value: "NON_VEG", label: "Non-veg" },
            { value: "EGGETARIAN", label: "Eggetarian" },
            { value: "VEGAN", label: "Vegan" },
          ]}
        />
      </FormField>

      <EquipmentField value={draft.equipment} onChange={(v) => set("equipment", v)} error={errors.equipment} />
      <DaysPerWeekField value={draft.trainingDaysPerWeek} onChange={(v) => set("trainingDaysPerWeek", v)} />
      <SessionMinutesField value={draft.sessionMinutes} onChange={(v) => set("sessionMinutes", v)} />
      <InjuriesField
        value={draft.injuries}
        onChange={(v) => set("injuries", v)}
        hint="We'll avoid exercises that load these."
      />

      <MedicalCheck checked={draft.medicalFlag} onToggle={() => set("medicalFlag", !draft.medicalFlag)} />
      {draft.medicalFlag && (
        <FormField label="Tell us about it (optional)" gap={6}>
          <TextField
            accessibilityLabel="Tell us about your medical condition, optional"
            value={draft.medicalNote}
            onChangeText={(v) => set("medicalNote", v)}
            placeholder="e.g. type 2 diabetes, on metformin; 20 weeks pregnant"
            placeholderTextColor="rgba(107,110,118,0.6)"
            multiline
            maxLength={MEDICAL_NOTE_MAX}
            invalid={Boolean(errors.medicalNote)}
            style={styles.noteInput}
          />
          {errors.medicalNote ? (
            <FieldError>{errors.medicalNote}</FieldError>
          ) : (
            <Text size={13} color={c.ink3}>
              Private to your account. {draft.medicalNote.length}/{MEDICAL_NOTE_MAX}
            </Text>
          )}
        </FormField>
      )}
    </>
  );
}

const useStyles = makeStyles(() => ({
  noteInput: { height: 96, paddingTop: 12, textAlignVertical: "top" },
}));
