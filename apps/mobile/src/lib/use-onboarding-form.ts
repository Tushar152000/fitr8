import type { PhoneCheckDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { useState, type RefObject } from "react";
import { LayoutAnimation, type ScrollView } from "react-native";
import { track } from "@/lib/analytics";
import { api, ApiError, errorMessage } from "@/lib/api";
import { emptyDraft, toPayload, validateStep, type DraftErrors, type OnboardingDraft } from "@/lib/onboarding-draft";
import { hintFor } from "@/lib/onboarding-hints";
import { PHONE_TAKEN, personProblems, phoneToE164, type PersonDetails, type PersonProblems } from "@/lib/person";
import { queryClient } from "@/lib/query";

/** Step 0, "Your details", is shown to first-time users only (editing a goal starts at 1). */
/** Step 2 "About you" holds body stats plus food and training (draft steps 2 and 3). */
export const LAST_STEP = 2;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Which parts of "About you" are unfolded. */
export type OpenParts = { body: boolean; food: boolean };

/**
 * Where an edit opens (`/onboarding?step=goal` or `?step=about&part=body|food`, from the Goal
 * page's rows). Only for returning users; back from that step leaves the flow.
 */
export type EditEntry = { step: "goal" } | { step: "about"; part: keyof OpenParts };

/** Reads the `step` / `part` route params; anything else is the default (goal step). */
export function editEntry(step: unknown, part: unknown): EditEntry | undefined {
  if (step === "goal") return { step: "goal" };
  if (step === "about") return { step: "about", part: part === "food" ? "food" : "body" };
  return undefined;
}

/**
 * State and actions of the onboarding form: the step, the draft and your details, errors, the
 * folding parts of "About you", and Continue (validate, phone check, then save on the last step).
 */
export function useOnboardingForm({
  initial,
  initialPerson,
  returning,
  scroll,
  entry,
}: {
  initial: Partial<OnboardingDraft>;
  initialPerson: PersonDetails;
  returning: boolean;
  /** Returning users only: open at this step (and part of "About you"). */
  entry?: EditEntry;
  /** The form's scroll view, sent back to the top on a new step. */
  scroll: RefObject<ScrollView | null>;
}) {
  const firstStep = returning ? 1 : 0;
  const start = returning && entry ? entry : undefined;
  /** The step the flow was opened at: back from it leaves. */
  const entryStep = start?.step === "about" ? LAST_STEP : firstStep;
  const [step, setStep] = useState(entryStep);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({ ...emptyDraft(), ...initial }));
  const [person, setPersonState] = useState<PersonDetails>(initialPerson);
  const [errors, setErrors] = useState<DraftErrors & PersonProblems>({});
  const [submitting, setSubmitting] = useState(false);
  const [built, setBuilt] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setPerson = (key: keyof PersonDetails, value: string) => {
    setPersonState((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const back = () => {
    setErrors({});
    if (step > entryStep) setStep(step - 1);
    // Opened by replace (welcome back → "Set a new goal") there's nothing behind it.
    else if (router.canGoBack()) router.back();
    else router.replace("/today");
  };

  // "About you" folds into two parts; "Your body" starts open (or the part an edit asked for).
  const [openPart, setOpenPartNow] = useState<OpenParts>(
    start?.step === "about" && start.part === "food" ? { body: false, food: true } : { body: true, food: false },
  );
  /** Folding animates: the next layout change eases instead of jumping. */
  const setOpenPart: typeof setOpenPartNow = (next) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(260, "easeInEaseOut", "opacity"));
    setOpenPartNow(next);
  };
  const togglePart = (part: keyof OpenParts) => setOpenPart((o) => ({ ...o, [part]: !o[part] }));
  const bodyDone = Object.keys(validateStep(2, draft)).length === 0;
  const foodDone = Object.keys(validateStep(3, draft)).length === 0;

  /** "Next: Food and training": check the body part, then fold it and open the next. */
  function finishBody() {
    const found = validateStep(2, draft);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setOpenPart({ body: false, food: true });
    scroll.current?.scrollTo({ y: 0, animated: true });
  }

  /** What still blocks this step, in field order (body before food on "About you"). */
  const problemsNow = (): DraftErrors & PersonProblems =>
    step === 0
      ? personProblems(person)
      : step === 1
        ? validateStep(1, draft)
        : { ...validateStep(2, draft), ...validateStep(3, draft) };
  const problems = problemsNow();
  /** Continue / Build my plan unlock once this step's required answers are valid. */
  const stepValid = Object.keys(problems).length === 0;
  // Names the first thing to fix, so a filled-in but rejected field never looks stuck.
  const firstProblem = Object.entries(problems).find(([, message]) => message);
  const continueHint = firstProblem ? hintFor(firstProblem[0], firstProblem[1]) : null;

  async function next() {
    const found = problemsNow();
    if (Object.keys(found).length) {
      setErrors(found);
      // Open whichever part of "About you" holds the problem so it can be seen.
      if (step === 2) setOpenPart((o) => ({ body: o.body || !bodyDone, food: o.food || !foodDone }));
      return;
    }
    // Warn now if another account has the number; the save refuses it anyway (409).
    if (step === 0 && person.phone.trim()) {
      const phone = phoneToE164(person.phoneCountry, person.phone);
      setSubmitting(true);
      const check = phone
        ? await api<PhoneCheckDto>(`/api/profile/phone-check?phone=${encodeURIComponent(phone)}`).catch(() => null)
        : null;
      setSubmitting(false);
      if (check && !check.available) {
        setErrors({ phone: PHONE_TAKEN });
        return;
      }
    }
    if (step < LAST_STEP) {
      setStep(step + 1);
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      if (!returning) {
        await api("/api/profile/name", {
          method: "PATCH",
          json: {
            name: person.name.trim(),
            lastName: person.lastName.trim(),
            phone: person.phone.trim() ? phoneToE164(person.phoneCountry, person.phone) : null,
          },
        });
      }
      // Keep the "building your plan" moment on screen long enough to read (min 2.6 s).
      await Promise.all([api("/api/onboarding", { json: toPayload(draft, timezone) }), wait(2600)]);
      // A new goal changes targets, the workout plan and everything derived from them.
      void queryClient.invalidateQueries();
      if (!returning) track("onboarding_complete", { platform: "app" });
      setBuilt(true);
      await wait(700);
      router.replace("/onboarding/plan");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && !returning) {
        // The number was taken meanwhile: back to step 1 with the warning.
        setSubmitting(false);
        setStep(0);
        setErrors({ phone: PHONE_TAKEN });
        scroll.current?.scrollTo({ y: 0, animated: false });
        return;
      }
      const details = err instanceof ApiError ? (err.details as { message?: string }[] | undefined) : undefined;
      setServerError(details?.[0]?.message ?? errorMessage(err, "Something went wrong. Try again."));
      setSubmitting(false);
    }
  }

  return {
    firstStep,
    entryStep,
    step,
    draft,
    set,
    person,
    setPerson,
    errors,
    submitting,
    built,
    serverError,
    stepValid,
    continueHint,
    openPart,
    togglePart,
    bodyDone,
    foodDone,
    finishBody,
    back,
    next,
  };
}
