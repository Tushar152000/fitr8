import { useQuery } from "@tanstack/react-query";
import type { WelcomeBackDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BodyNowCard } from "@/components/onboarding/body-now-card";
import { FormFooter } from "@/components/onboarding/form-footer";
import { GoalPassed } from "@/components/onboarding/goal-passed";
import { MedicalCheck } from "@/components/onboarding/medical-check";
import {
  ActivityField,
  DaysPerWeekField,
  EquipmentField,
  InjuriesField,
  SessionMinutesField,
} from "@/components/onboarding/routine-fields";
import { FormSkeleton } from "@/components/skeletons";
import { Button, FieldError, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth, useMe } from "@/lib/auth";
import { planQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { gutter, useColors } from "@/lib/theme";
import type { Profile } from "@/lib/types";
import type { PlanResponse } from "@/lib/types-plan";
import {
  toWelcomeBackInput,
  validateWelcomeBack,
  welcomeBackDraft,
  type WelcomeBackDraft,
  type WelcomeBackErrors,
} from "@/lib/welcome-back-draft";

/**
 * Back after 90+ days away (MeDto.welcomeBack): ask again only what changes over time — weight,
 * height, how active, where and how much they train, injuries, the health flag. Sex, birth date,
 * diet and the goal are kept. Weight starts empty on purpose: the old one is the hint, not the answer.
 */
export default function WelcomeBackScreen() {
  const me = useMe();
  const plan = useQuery(planQuery);
  const c = useColors();

  if (plan.isPending || !me.profile) {
    return (
      <View style={{ flex: 1, padding: gutter, paddingTop: 72, gap: 20, backgroundColor: c.ground }}>
        <FormSkeleton />
      </View>
    );
  }
  // No plan to read (shouldn't happen once onboarded): the form still works without the hints.
  return <WelcomeBackForm profile={me.profile} name={me.name} plan={plan.data ?? null} />;
}

function WelcomeBackForm({
  profile,
  name,
  plan,
}: {
  profile: Profile;
  name: string | null;
  plan: PlanResponse | null;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { refresh } = useAuth();
  const bodyFatGoal = plan?.goal.targetBodyFatPct != null;

  const [draft, setDraft] = useState<WelcomeBackDraft>(() => welcomeBackDraft(profile));
  const [errors, setErrors] = useState<WelcomeBackErrors>({});
  const [busy, setBusy] = useState<"save" | "skip" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [goalPassed, setGoalPassed] = useState(false);

  const set = <K extends keyof WelcomeBackDraft>(key: K, value: WelcomeBackDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function save() {
    const found = validateWelcomeBack(draft, bodyFatGoal);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy("save");
    setServerError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    try {
      const res = await api<WelcomeBackDto>("/api/welcome-back", {
        json: toWelcomeBackInput(draft, profile.sex, timezone),
      });
      track("welcome_back", { action: "updated" });
      // New weight and routine change targets, the workout plan and everything derived from them.
      void queryClient.invalidateQueries();
      if (res.goalPassed) {
        setGoalPassed(true);
        setBusy(null);
        return;
      }
      await refresh(); // welcomeBack is now false: the guard opens the app on Today.
    } catch (err) {
      const details = err instanceof ApiError ? (err.details as { message?: string }[] | undefined) : undefined;
      setServerError(details?.[0]?.message ?? errorMessage(err, "Something went wrong. Try again."));
      setBusy(null);
    }
  }

  async function notNow() {
    setBusy("skip");
    setServerError(null);
    try {
      await api("/api/me/active", { method: "POST" });
      track("welcome_back", { action: "dismissed" });
      await refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Something went wrong. Try again."));
      setBusy(null);
    }
  }

  if (goalPassed) {
    return (
      <GoalPassed
        onNewGoal={() => {
          // Onboarding stays reachable for a signed-in user; refreshing then opens the app behind it.
          router.replace("/onboarding");
          void refresh();
        }}
        onKeepGoal={() => void refresh()}
      />
    );
  }

  const first = name?.split(" ")[0];
  return (
    // The form and its footer ride up with the keyboard on both platforms (edge-to-edge Android
    // doesn't resize for it), so the field being typed in and Continue stay visible.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: 24, gap: 24 }}
      >
        {/* No back button: this is a gate. The eyebrow + title follow PageHeader's type. */}
        <View style={{ gap: 8, paddingTop: 8 }}>
          <View style={{ gap: 2 }}>
            <Text variant="labelStrong" color={c.ink2}>
              It&apos;s been a while
            </Text>
            <Text variant="title" accessibilityRole="header">
              Welcome back{first ? `, ${first}` : ""}
            </Text>
          </View>
          <Text variant="bodySm" color={c.ink2}>
            A few months can change a lot. Check these so your calories and workouts fit you today. Your goal and
            everything else stay as they were.
          </Text>
        </View>

        <BodyNowCard
          draft={draft}
          set={set}
          errors={errors}
          last={plan?.metric}
          bodyFatGoal={bodyFatGoal}
          female={profile.sex === "FEMALE"}
        />
        <ActivityField value={draft.activityLevel} onChange={(v) => set("activityLevel", v)} />
        <EquipmentField value={draft.equipment} onChange={(v) => set("equipment", v)} />
        <DaysPerWeekField value={draft.trainingDaysPerWeek} onChange={(v) => set("trainingDaysPerWeek", v)} />
        <SessionMinutesField value={draft.sessionMinutes} onChange={(v) => set("sessionMinutes", v)} />
        <InjuriesField value={draft.injuries} onChange={(v) => set("injuries", v)} />
        <MedicalCheck checked={draft.medicalFlag} onToggle={() => set("medicalFlag", !draft.medicalFlag)} />
      </ScrollView>

      <FormFooter>
        {serverError && <FieldError>{serverError}</FieldError>}
        {Object.values(errors).some(Boolean) && (
          <Text variant="labelMedium" color={c.ink2} center>
            Check the highlighted fields above.
          </Text>
        )}
        <Button onPress={save} loading={busy === "save"} disabled={busy === "skip"}>
          Update my plan
        </Button>
        <Button variant="secondary" onPress={notNow} loading={busy === "skip"} disabled={busy === "save"}>
          Not now
        </Button>
      </FormFooter>
    </KeyboardAvoidingView>
  );
}
