import { Info } from "lucide-react-native";
import { View } from "react-native";
import { DateField, FormField, NumberField, Segmented, Text } from "@/components/ui";
import { wantsBodyFat } from "@/lib/onboarding-draft";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { FieldCell, FieldGrid } from "./field-grid";
import { ActivityField } from "./routine-fields";
import type { StepProps } from "./step-props";

/** "Your body", the first part of "About you": sex, birth date, height, weight, measurements, activity. */
export function AboutStep({ draft, set, errors }: StepProps) {
  const c = useColors();
  const styles = useStyles();
  const bf = wantsBodyFat(draft);
  return (
    <>
      <FormField label="Sex" error={errors.sex}>
        <Segmented
          label="Sex"
          value={draft.sex}
          onChange={(v) => set("sex", v)}
          options={[
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
          ]}
        />
      </FormField>

      <DateField
        label="Date of birth"
        value={draft.birthDate}
        onValueChange={(v) => set("birthDate", v)}
        error={errors.birthDate}
      />

      <FieldGrid>
        <FieldCell>
          <NumberField
            label="Height"
            unit="cm"
            placeholder="170"
            value={draft.heightCm}
            onValueChange={(v) => set("heightCm", v)}
            error={errors.heightCm}
          />
        </FieldCell>
        <FieldCell>
          <NumberField
            label="Weight"
            unit="kg"
            placeholder="75"
            value={draft.weightKg}
            onValueChange={(v) => set("weightKg", v)}
            error={errors.weightKg}
          />
        </FieldCell>
      </FieldGrid>

      {/* Waist and neck (and hip) give body fat; they're asked only for a body-fat goal. */}
      {bf && (
        <FormField label="Body measurements">
          <FieldGrid>
            <FieldCell>
              <NumberField
                label="Waist"
                unit="cm"
                value={draft.waistCm}
                onValueChange={(v) => set("waistCm", v)}
                error={errors.waistCm}
              />
            </FieldCell>
            <FieldCell>
              <NumberField
                label="Neck"
                unit="cm"
                value={draft.neckCm}
                onValueChange={(v) => set("neckCm", v)}
                error={errors.neckCm}
              />
            </FieldCell>
            {draft.sex === "FEMALE" && (
              <FieldCell>
                <NumberField
                  label="Hip"
                  unit="cm"
                  value={draft.hipCm}
                  onValueChange={(v) => set("hipCm", v)}
                  error={errors.hipCm}
                />
              </FieldCell>
            )}
          </FieldGrid>
          <View style={styles.tip}>
            <Info size={18} color={c.ink2} strokeWidth={2} style={{ marginTop: 1 }} />
            <Text variant="labelRegular" color={c.ink2} style={{ flex: 1, lineHeight: 18 }}>
              <Text variant="labelStrong">Measuring tip:</Text> use a soft tape, standing relaxed. Waist at the navel
              after breathing out; neck just below the Adam&apos;s apple
              {draft.sex === "FEMALE" ? "; hips at the widest point" : ""}. We use these to estimate your body fat for
              your goal.
            </Text>
          </View>
        </FormField>
      )}

      <ActivityField
        value={draft.activityLevel}
        onChange={(v) => set("activityLevel", v)}
        error={errors.activityLevel}
      />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  /** Grey inset on the white fold card. */
  tip: { flexDirection: "row", gap: 10, borderRadius: radius.input, backgroundColor: c.ground, padding: 14 },
}));
