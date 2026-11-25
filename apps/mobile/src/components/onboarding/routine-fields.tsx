import { ChipGroup, ChoiceCardGroup, FormField, Segmented, Text, TextField, TileGroup } from "@/components/ui";
import { fade, useColors } from "@/lib/theme";
import { ACTIVITY_OPTIONS, EQUIPMENT_OPTIONS, type Activity, type Equipment } from "./profile-options";

/*
 * The routine questions asked at onboarding and again on welcome back. Each is a labelled control;
 * the screen owns the value.
 */

/** "How active are you outside workouts?" as radio cards. */
export function ActivityField({
  value,
  onChange,
  error,
}: {
  value: Activity | undefined;
  onChange: (value: Activity) => void;
  error?: string;
}) {
  return (
    <FormField label="How active are you outside workouts?" error={error}>
      <ChoiceCardGroup label="Activity level" value={value} onChange={onChange} options={ACTIVITY_OPTIONS} />
    </FormField>
  );
}

/** "Where I train": gym, home or anywhere. */
export function EquipmentField({
  value,
  onChange,
  error,
}: {
  value: Equipment | undefined;
  onChange: (value: Equipment) => void;
  error?: string;
}) {
  return (
    <FormField label="Where I train" error={error}>
      <TileGroup label="Where I train" value={value} onChange={onChange} options={EQUIPMENT_OPTIONS} />
    </FormField>
  );
}

/** Training days per week, 2 to 6. */
export function DaysPerWeekField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <FormField label="Days per week">
      <ChipGroup
        label="Days per week"
        value={value}
        onChange={onChange}
        options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n} days` }))}
      />
    </FormField>
  );
}

/** Session length: 30, 45 or 60 minutes (a stored value snaps to the nearest). */
export function SessionMinutesField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <FormField label="Minutes per session">
      <Segmented
        label="Minutes per session"
        value={Math.min(60, Math.max(30, Math.round(value / 15) * 15))}
        onChange={onChange}
        options={[30, 45, 60].map((n) => ({ value: n, label: `${n} min` }))}
      />
    </FormField>
  );
}

/** Free-text injuries, comma separated; `hint` is the line under the input. */
export function InjuriesField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const c = useColors();
  return (
    <FormField label="Injuries or pain (optional)" gap={6}>
      <TextField
        accessibilityLabel="Injuries or pain"
        value={value}
        onChangeText={onChange}
        placeholder="e.g. left knee, lower back"
        placeholderTextColor={fade(c.ink3, 0.6)}
      />
      {hint && (
        <Text size={13} color={c.ink3}>
          {hint}
        </Text>
      )}
    </FormField>
  );
}
