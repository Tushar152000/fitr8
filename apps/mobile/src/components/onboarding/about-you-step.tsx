import { PersonStanding, Utensils } from "lucide-react-native";
import { PressableScale, Text } from "@/components/ui";
import { validateStep } from "@/lib/onboarding-draft";
import { bodySummary, trainingSummary } from "@/lib/onboarding-summary";
import { makeStyles, useColors } from "@/lib/theme";
import type { OpenParts } from "@/lib/use-onboarding-form";
import { AboutStep } from "./about-step";
import { FoldSection } from "./fold-section";
import type { StepProps } from "./step-props";
import { TrainingStep } from "./training-step";

/**
 * Onboarding step 2, "About you": "Your body" and "Food and training" as two folding parts, each
 * with a one-line summary while shut and a badge for done or needs a look.
 */
export function AboutYouStep({
  draft,
  set,
  errors,
  open,
  onToggle,
  bodyDone,
  foodDone,
  onFinishBody,
}: StepProps & {
  open: OpenParts;
  onToggle: (part: keyof OpenParts) => void;
  bodyDone: boolean;
  foodDone: boolean;
  /** "Next: Food and training". */
  onFinishBody: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const partHasError = (n: 2 | 3) => Object.keys(validateStep(n, draft)).some((k) => errors[k as keyof typeof errors]);
  const props = { draft, set, errors };
  return (
    <>
      <FoldSection
        icon={<PersonStanding size={18} color={c.brand} />}
        title="Your body"
        summary={bodySummary(draft)}
        done={bodyDone}
        attention={partHasError(2)}
        open={open.body}
        onToggle={() => onToggle("body")}
      >
        <AboutStep {...props} />
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !bodyDone }}
          onPress={onFinishBody}
          style={[styles.nextPart, !bodyDone && { opacity: 0.5 }]}
        >
          <Text weight={600} size={16} color={c.brand}>
            Next: Food and training
          </Text>
        </PressableScale>
      </FoldSection>
      <FoldSection
        icon={<Utensils size={16} color={c.brand} />}
        title="Food and training"
        summary={trainingSummary(draft)}
        done={foodDone}
        attention={partHasError(3)}
        open={open.food}
        onToggle={() => onToggle("food")}
      >
        <TrainingStep {...props} />
      </FoldSection>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  nextPart: {
    alignSelf: "flex-start",
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: c.sunken,
  },
}));
