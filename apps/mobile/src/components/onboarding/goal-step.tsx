import { CalendarDays, Dumbbell, Scale, Sparkles } from "lucide-react-native";
import { useState } from "react";
import {
  ChoiceCardGroup,
  DateField,
  FormField,
  NumberField,
  PressableScale,
  Segmented,
  Text,
  TileGroup,
} from "@/components/ui";
import { shortDate } from "@/lib/dates";
import { needsTarget, ymd, type OnboardingDraft } from "@/lib/onboarding-draft";
import { useColors } from "@/lib/theme";
import { choiceIcon } from "./profile-options";
import type { StepProps } from "./step-props";

/** Onboarding step 1, "Your goal": what you want, the target to aim for, and by when. */
export function GoalStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <FormField label="Pick one" error={errors.goalType}>
        <ChoiceCardGroup
          label="Goal"
          value={draft.goalType}
          onChange={(v) => set("goalType", v)}
          options={[
            {
              value: "FAT_LOSS",
              label: "Lose fat",
              description: "Drop fat, keep your muscle",
              icon: choiceIcon(Scale),
            },
            {
              value: "MUSCLE_GAIN",
              label: "Build muscle",
              description: "A lean surplus with progressive training",
              icon: choiceIcon(Dumbbell),
            },
            {
              value: "RECOMPOSITION",
              label: "Recomposition",
              description: "Stay near your weight, lose fat, gain muscle",
              icon: choiceIcon(Sparkles),
            },
          ]}
        />
      </FormField>

      {needsTarget(draft) && (
        <FormField label="Aim for" gap={12}>
          <Segmented
            label="Aim for"
            value={draft.targetMode}
            onChange={(v) => set("targetMode", v)}
            options={[
              { value: "BODY_FAT", label: "Body fat %" },
              { value: "WEIGHT", label: "Weight" },
            ]}
          />
          {draft.targetMode === "WEIGHT" ? (
            <NumberField
              label="Target weight"
              unit="kg"
              placeholder="72"
              value={draft.targetWeightKg}
              onValueChange={(v) => set("targetWeightKg", v)}
              error={errors.targetWeightKg}
            />
          ) : (
            <NumberField
              label="Target body fat"
              unit="%"
              placeholder="15"
              value={draft.targetBodyFatPct}
              onValueChange={(v) => set("targetBodyFatPct", v)}
              error={errors.targetBodyFatPct}
              hint="We'll ask for waist and neck so we can estimate your current body fat."
            />
          )}
        </FormField>
      )}

      <ByWhen draft={draft} set={set} error={errors.targetDate} />
    </>
  );
}

const WEEK_OPTIONS = [12, 16, 24];

/** Design 2: "By when?" — three quick tiles with end dates, or an exact date. */
function ByWhen({ draft, set, error }: { draft: OnboardingDraft; set: StepProps["set"]; error?: string }) {
  const c = useColors();
  const today = new Date();
  const dateIn = (weeks: number) => ymd(new Date(today.getTime() + weeks * 7 * 86_400_000));
  const tileWeeks = WEEK_OPTIONS.find((w) => dateIn(w) === draft.targetDate);
  const [exact, setExact] = useState(tileWeeks === undefined);

  return (
    <FormField label="By when?" error={exact ? undefined : error}>
      <TileGroup
        label="By when?"
        value={exact ? undefined : tileWeeks}
        onChange={(w) => {
          setExact(false);
          set("targetDate", dateIn(w));
        }}
        options={WEEK_OPTIONS.map((w) => ({ value: w, label: `${w} weeks`, sub: shortDate(dateIn(w)) }))}
      />
      {exact ? (
        <DateField
          label="Exact date"
          value={draft.targetDate}
          onValueChange={(v) => set("targetDate", v)}
          error={error}
          hint="We'll tell you if it's too fast and suggest a safer date."
        />
      ) : (
        <PressableScale
          accessibilityRole="button"
          onPress={() => setExact(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start" }}
        >
          <CalendarDays size={18} color={c.brandText} strokeWidth={2} />
          <Text variant="bodyStrong" color={c.brandText}>
            Choose an exact date
          </Text>
        </PressableScale>
      )}
    </FormField>
  );
}
