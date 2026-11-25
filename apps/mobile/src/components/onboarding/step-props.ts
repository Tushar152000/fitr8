import type { DraftErrors, OnboardingDraft } from "@/lib/onboarding-draft";

/** What every plan step of onboarding gets: the draft, its setter and the shown errors. */
export type StepProps = {
  draft: OnboardingDraft;
  set: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  errors: DraftErrors;
};
