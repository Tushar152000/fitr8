import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Activity,
  Award,
  Bandage,
  Calendar,
  CalendarDays,
  Dumbbell,
  HeartPulse,
  Ruler,
  Salad,
  Target,
  TrendingDown,
} from "lucide-react-native";
import { GoalSummaryCard } from "@/components/goal/goal-summary-card";
import { ProfilePage } from "@/components/profile/profile-page";
import { QueryError } from "@/components/query-error";
import { FadeIn, MenuGroup, MenuRow, PillButton, Skeleton } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { ACTIVITY_SHORT, DIET_LABEL, EXPERIENCE_LABEL, WHERE_LABEL, targetLabel } from "@/lib/goal-details";
import { GOAL_LABEL } from "@/lib/profile-summary";
import { planQuery, progressQuery } from "@/lib/queries";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * The edit-goal flow (onboarding for a returning user), opened at the row's step: the goal step, or
 * "About you" with its body or food-and-training part unfolded. "Update goal" starts at the goal step.
 */
const editGoal = () => router.push("/onboarding?step=goal");
const editBody = () => router.push("/onboarding?step=about&part=body");
const editFood = () => router.push("/onboarding?step=about&part=food");

/**
 * Figma frame 9 "Profile / Goal": the goal card (target, progress, daily targets), PLAN DETAILS and
 * "Update goal". Below them, ABOUT YOU keeps the body, food and training answers that used to sit on
 * Profile (weight and body fat live on Measurements).
 */
export default function GoalScreen() {
  const me = useMe();
  const plan = useQuery(planQuery);
  const progress = useQuery(progressQuery);
  const pull = usePullRefresh(() => Promise.all([plan.refetch(), progress.refetch()]));
  const profile = me.profile;
  const error = plan.error ?? progress.error;

  return (
    <ProfilePage
      title="Your goal"
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      footer={plan.data && progress.data && profile ? <PillButton label="Update goal" onPress={editGoal} /> : undefined}
    >
      {error ? (
        <QueryError error={error} onRetry={() => Promise.all([plan.refetch(), progress.refetch()])} />
      ) : !plan.data || !progress.data || !profile ? (
        <>
          <Skeleton height={190} />
          <Skeleton height={248} />
        </>
      ) : (
        <FadeIn style={{ gap: 24 }}>
          <GoalSummaryCard plan={plan.data} progress={progress.data} />
          <MenuGroup label="Plan details">
            <MenuRow icon={Target} title="Goal type" value={GOAL_LABEL[plan.data.goal.type]} onPress={editGoal} />
            <MenuRow icon={TrendingDown} title="Target weight" value={targetLabel(plan.data.goal)} onPress={editGoal} />
            <MenuRow
              icon={Calendar}
              title="Weekly pace"
              value={`${Math.abs(plan.data.summary.plan.weeklyChangeKg).toFixed(1)} kg`}
              onPress={editGoal}
            />
            <MenuRow
              icon={Activity}
              title="Activity level"
              value={ACTIVITY_SHORT[profile.activityLevel]}
              onPress={editBody}
            />
          </MenuGroup>
          <MenuGroup label="About you">
            <MenuRow icon={Ruler} title="Height" value={`${profile.heightCm} cm`} onPress={editBody} />
            <MenuRow icon={Salad} title="Diet" value={DIET_LABEL[profile.dietType]} onPress={editFood} />
            <MenuRow icon={Dumbbell} title="Where I train" value={WHERE_LABEL[profile.equipment]} onPress={editFood} />
            <MenuRow
              icon={CalendarDays}
              title="Sessions"
              value={`${profile.trainingDaysPerWeek} a week · ${profile.sessionMinutes} min`}
              onPress={editFood}
            />
            <MenuRow icon={Award} title="Experience" value={EXPERIENCE_LABEL[profile.experience]} onPress={editFood} />
            <MenuRow
              icon={Bandage}
              title="Injuries"
              subtitle={profile.injuries.length ? profile.injuries.join(", ") : null}
              value={profile.injuries.length ? null : "None"}
              onPress={editFood}
            />
            <MenuRow
              icon={HeartPulse}
              title="Health condition"
              subtitle={profile.medicalFlag ? profile.medicalNote : null}
              value={profile.medicalFlag ? "Yes" : "None"}
              onPress={editFood}
            />
          </MenuGroup>
        </FadeIn>
      )}
    </ProfilePage>
  );
}
