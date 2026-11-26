import { View } from "react-native";
import { NumberField, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { PlanResponse } from "@/lib/types-plan";
import { numberText, type WelcomeBackDraft, type WelcomeBackErrors } from "@/lib/welcome-back-draft";
import { FieldCell, FieldGrid } from "./field-grid";
import { OnSurface } from "@/components/ui/surface";

/**
 * Welcome back, "Your body now": weight today and height, plus waist and neck (and hip for women)
 * for a body-fat goal. The last saved numbers are the placeholders.
 */
export function BodyNowCard({
  draft,
  set,
  errors,
  last,
  bodyFatGoal,
  female,
}: {
  draft: WelcomeBackDraft;
  set: <K extends keyof WelcomeBackDraft>(key: K, value: WelcomeBackDraft[K]) => void;
  errors: WelcomeBackErrors;
  /** The last check-in from the plan, when there is one. */
  last: PlanResponse["metric"] | undefined;
  bodyFatGoal: boolean;
  female: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  const lastWeight = last?.weightKg;
  return (
    <View style={styles.card}>
      <OnSurface>
        <Text variant="heading2" accessibilityRole="header">
          Your body now
        </Text>
        <FieldGrid>
          <FieldCell>
            <NumberField
              label="Weight today"
              unit="kg"
              placeholder={lastWeight != null ? String(lastWeight) : "75"}
              value={draft.weightKg}
              onValueChange={(v) => set("weightKg", v)}
              error={errors.weightKg}
            />
          </FieldCell>
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
          {bodyFatGoal && (
            <>
              <FieldCell>
                <NumberField
                  label="Waist"
                  unit="cm"
                  placeholder={numberText(last?.waistCm)}
                  value={draft.waistCm}
                  onValueChange={(v) => set("waistCm", v)}
                  error={errors.waistCm}
                />
              </FieldCell>
              <FieldCell>
                <NumberField
                  label="Neck"
                  unit="cm"
                  placeholder={numberText(last?.neckCm)}
                  value={draft.neckCm}
                  onValueChange={(v) => set("neckCm", v)}
                  error={errors.neckCm}
                />
              </FieldCell>
              {female && (
                <FieldCell>
                  <NumberField
                    label="Hip (optional)"
                    unit="cm"
                    placeholder={numberText(last?.hipCm)}
                    value={draft.hipCm}
                    onValueChange={(v) => set("hipCm", v)}
                    error={errors.hipCm}
                  />
                </FieldCell>
              )}
            </>
          )}
        </FieldGrid>
        {lastWeight != null && (
          <Text variant="labelRegular" color={c.ink2} style={{ lineHeight: 18 }}>
            Last time you weighed {lastWeight} kg. Weigh in the morning, before food.
          </Text>
        )}
      </OnSurface>
    </View>
  );
}

/** v2 white card: radius 20, card lift, 20 padding (a summary-style card). */
const useStyles = makeStyles((c, shadows) => ({
  card: { backgroundColor: c.surface, borderRadius: radius.card, padding: 20, gap: 16, ...shadows.card },
}));
