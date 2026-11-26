import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Button, ChoiceCardGroup, FieldError, PressableScale, Screen, SectionLabel, Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { useColors } from "@/lib/theme";
import type { PlanResponse } from "@/lib/types-plan";
import { PlanBadge } from "./plan-badge";
import { StepsBar } from "./steps-bar";
import { TargetCard } from "./target-card";

type Choice = "KEEP_GOAL" | "KEEP_DATE";

/** Design 5b: the goal needs an unsafe pace; pick a later date or a closer target. */
export function TooFast({ data, onStart, starting }: { data: PlanResponse; onStart: () => void; starting: boolean }) {
  const { summary, goal } = data;
  const p = summary.plan;
  const suggestedDate = p.suggestedTargetDate ?? null;
  const closer = p.closerTargetWeightKg != null ? Math.round(p.closerTargetWeightKg * 2) / 2 : null;
  const [choice, setChoice] = useState<Choice>(suggestedDate ? "KEEP_GOAL" : "KEEP_DATE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = useColors();
  const verb = goal.type === "FAT_LOSS" ? "Losing" : "Gaining";

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/goal/option", { json: { choice } });
      onStart();
    } catch (e) {
      setError(errorMessage(e, "Couldn't save. Try again."));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          {error && <FieldError>{error}</FieldError>}
          <Button onPress={start} loading={busy || starting}>
            {choice === "KEEP_GOAL" && suggestedDate
              ? `Start — goal by ${longDate(suggestedDate)}`
              : `Start — ${closer} kg by ${longDate(goal.targetDate)}`}
          </Button>
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.replace("/onboarding")}
            style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text variant="bodyStrong" color={c.ink2}>
              Change my goal
            </Text>
          </PressableScale>
        </>
      }
    >
      <StepsBar current={4} total={4} />
      <View style={{ gap: 12 }}>
        <PlanBadge
          icon={<TriangleAlert size={16} color={c.cautionText} />}
          label="Too fast to be safe"
          color={c.cautionText}
          background={c.cautionSoft}
        />
        <Text variant="title" accessibilityRole="header">
          {verb} {Math.abs(p.neededWeeklyChangeKg).toFixed(1)} kg a week isn&apos;t safe
        </Text>
        <Text variant="bodySm" color={c.ink2}>
          A safe pace for you is about {Math.abs(p.weeklyChangeKg).toFixed(1)} kg a week. Pick what matters more:
        </Text>
      </View>

      <ChoiceCardGroup
        label="Safer option"
        value={choice}
        onChange={setChoice}
        options={[
          ...(suggestedDate
            ? [
                {
                  value: "KEEP_GOAL" as const,
                  label: "Keep the goal · recommended",
                  description: `Reach ${p.targetWeightKg} kg by ${longDate(suggestedDate)}`,
                },
              ]
            : []),
          ...(closer != null
            ? [
                {
                  value: "KEEP_DATE" as const,
                  label: "Keep the date",
                  description: `Reach ${closer} kg by ${longDate(goal.targetDate)}, then keep going`,
                },
              ]
            : []),
        ]}
      />

      <View style={{ gap: 10 }}>
        <SectionLabel>Your daily target either way</SectionLabel>
        <TargetCard summary={summary} />
      </View>
    </Screen>
  );
}
