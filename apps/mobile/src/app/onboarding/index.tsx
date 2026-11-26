import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AboutYouStep } from "@/components/onboarding/about-you-step";
import { DetailsStep } from "@/components/onboarding/details-step";
import { FormFooter } from "@/components/onboarding/form-footer";
import { GoalStep } from "@/components/onboarding/goal-step";
import { PlanBuilder } from "@/components/onboarding/plan-builder";
import { StepsBar } from "@/components/onboarding/steps-bar";
import { FormSkeleton } from "@/components/skeletons";
import { Button, FieldError, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import type { OnboardingDraft } from "@/lib/onboarding-draft";
import { splitName, splitPhone, type PersonDetails } from "@/lib/person";
import { planQuery } from "@/lib/queries";
import { gutter, useColors } from "@/lib/theme";
import { editEntry, LAST_STEP, useOnboardingForm, type EditEntry } from "@/lib/use-onboarding-form";

const STEP_TITLES = ["What can we call you?", "Your goal", "About you"];
/** The line under each title (the web shows the same words). */
const STEP_LEADS = [
  "A few quick questions and you’ll have daily calories, macros and a training week built for you.",
  "Pick what you want and by when. We’ll check the pace is safe and set your daily calories.",
  "Your body, food and training decide your calories, macros and training week. Only you can see them.",
];
const str = (n: number | null | undefined) => (n == null ? "" : String(n));

/**
 * Onboarding: your details (first time only), then the three plan steps. Prefills from the account
 * and, when the goal is edited, from the existing profile.
 */
export default function OnboardingScreen() {
  const me = useMe();
  // Goal page rows open the edit at their step: `?step=goal` or `?step=about&part=body|food`.
  const params = useLocalSearchParams<{ step?: string; part?: string }>();
  const returning = me.onboarded;
  const plan = useQuery({ ...planQuery, enabled: returning });
  const c = useColors();
  if (returning && plan.isPending) {
    return (
      <View style={{ flex: 1, padding: gutter, paddingTop: 72, gap: 20, backgroundColor: c.ground }}>
        <FormSkeleton />
      </View>
    );
  }

  const p = me.profile;
  const initial: Partial<OnboardingDraft> =
    returning && p
      ? {
          goalType: plan.data?.goal.type,
          targetMode: plan.data?.goal.targetBodyFatPct != null ? "BODY_FAT" : "WEIGHT",
          targetWeightKg: str(plan.data?.goal.targetWeightKg),
          targetBodyFatPct: str(plan.data?.goal.targetBodyFatPct),
          targetDate: plan.data?.goal.targetDate,
          sex: p.sex,
          birthDate: p.birthDate.slice(0, 10),
          heightCm: str(p.heightCm),
          weightKg: str(plan.data?.metric.weightKg),
          waistCm: str(plan.data?.metric.waistCm),
          neckCm: str(plan.data?.metric.neckCm),
          hipCm: str(plan.data?.metric.hipCm),
          activityLevel: p.activityLevel,
          dietType: p.dietType,
          experience: p.experience,
          equipment: p.equipment,
          trainingDaysPerWeek: p.trainingDaysPerWeek,
          sessionMinutes: p.sessionMinutes,
          injuries: p.injuries.join(", "),
          medicalFlag: p.medicalFlag,
          medicalNote: p.medicalNote ?? "",
        }
      : {};
  // The dev sign-in names accounts after the email, which isn't worth prefilling.
  const realName = me.name && me.name !== me.email?.split("@")[0] ? me.name : null;
  const phone = splitPhone(me.phone);
  const initialPerson: PersonDetails = {
    ...splitName(realName, me.lastName),
    phoneCountry: phone.country,
    phone: phone.national,
  };
  return (
    <OnboardingForm
      initial={initial}
      initialPerson={initialPerson}
      returning={returning}
      entry={editEntry(params.step, params.part)}
    />
  );
}

function OnboardingForm(props: {
  initial: Partial<OnboardingDraft>;
  initialPerson: PersonDetails;
  returning: boolean;
  entry?: EditEntry;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const form = useOnboardingForm({ ...props, scroll });
  const { step, firstStep, draft, set, errors } = form;
  const steps = { current: step + 1 - firstStep, total: LAST_STEP + 2 - firstStep };

  return (
    // The form and its footer ride up with the keyboard on both platforms (edge-to-edge Android
    // doesn't resize for it), so the field being typed in and Continue stay visible.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: 24, gap: 24 }}
      >
        <StepsBar {...steps} onBack={step > firstStep || props.returning ? form.back : undefined} />
        <View style={{ gap: 8 }}>
          <Text variant="title" accessibilityRole="header">
            {STEP_TITLES[step]}
          </Text>
          <Text variant="bodySm" color={c.ink2}>
            {STEP_LEADS[step]}
          </Text>
        </View>
        {step === 0 && <DetailsStep person={form.person} setPerson={form.setPerson} errors={errors} />}
        {step === 1 && <GoalStep draft={draft} set={set} errors={errors} />}
        {step === 2 && (
          <AboutYouStep
            draft={draft}
            set={set}
            errors={errors}
            open={form.openPart}
            onToggle={form.togglePart}
            bodyDone={form.bodyDone}
            foodDone={form.foodDone}
            onFinishBody={form.finishBody}
          />
        )}
      </ScrollView>
      <FormFooter>
        {form.serverError && <FieldError>{form.serverError}</FieldError>}
        {Object.values(errors).some(Boolean) ? (
          <Text variant="labelMedium" color={c.ink2} center>
            Check the highlighted fields above.
          </Text>
        ) : (
          !form.stepValid && (
            <Text variant="labelRegular" color={c.ink3} center>
              {form.continueHint}
            </Text>
          )
        )}
        <Button onPress={form.next} loading={form.submitting} style={!form.stepValid && { opacity: 0.6 }}>
          {step < LAST_STEP ? "Continue" : "Build my plan"}
        </Button>
      </FormFooter>
      {form.submitting && <PlanBuilder done={form.built} />}
    </KeyboardAvoidingView>
  );
}
