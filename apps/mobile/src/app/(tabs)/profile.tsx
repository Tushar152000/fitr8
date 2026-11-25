import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { HeartPulse, LogOut } from "lucide-react-native";
import { Platform } from "react-native";
import { AppearancePicker } from "@/components/profile/appearance-picker";
import { DangerZone } from "@/components/profile/danger-zone";
import { BodyGroup, FoodTrainingGroup } from "@/components/profile/details-groups";
import { ExportRow } from "@/components/profile/export-row";
import { GoalCard } from "@/components/profile/goal-card";
import { PlanCard } from "@/components/profile/plan-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { RemindersGroup } from "@/components/profile/reminders-group";
import { LinkRow } from "@/components/profile/rows";
import { GoalCardSkeleton } from "@/components/skeletons";
import { Button, ListCard, Screen, Text } from "@/components/ui";
import { useAuth, useMe } from "@/lib/auth";
import { openLegal } from "@/lib/legal";
import { dayQuery, planQuery, remindersQuery, usageQuery } from "@/lib/queries";
import { useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/** Screen 13: profile and settings. */
export default function ProfileScreen() {
  const c = useColors();
  const me = useMe();
  const { signOut } = useAuth();
  const plan = useQuery(planQuery);
  const usage = useQuery(usageQuery);
  const pull = usePullRefresh(() => Promise.all([plan.refetch(), usage.refetch()]));
  const day = useQuery(dayQuery);
  // Also keeps this phone's scheduled reminders in step (tabs layout shares the query).
  const reminders = useQuery(remindersQuery);
  const profile = me.profile!;

  return (
    <Screen tabBar refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <ProfileHeader me={me} pro={usage.data?.plan === "PRO"} streak={day.data?.streak ?? 0} />

      {usage.data && <PlanCard usage={usage.data} />}

      {plan.isPending ? <GoalCardSkeleton /> : <GoalCard goal={plan.data?.goal} target={plan.data?.summary.target} />}

      <BodyGroup profile={profile} metric={plan.data?.metric} />

      <FoodTrainingGroup profile={profile} />

      <RemindersGroup
        titles={reminders.data?.reminders.map((r) => r.title) ?? []}
        lunch={profile.remindLunch}
        dinner={profile.remindDinner}
        water={profile.remindWater ?? false}
      />

      <ListCard title="Health apps">
        <LinkRow
          label={Platform.OS === "ios" ? "Apple Health" : "Health Connect"}
          sub="Steps, heart rate, BMI, blood oxygen, sleep and recovery"
          icon={<HeartPulse size={20} color={c.brandText} />}
          onPress={() => router.push("/health")}
        />
      </ListCard>

      <ListCard title="Appearance">
        <AppearancePicker />
      </ListCard>

      <ListCard title="Your data">
        <ExportRow />
      </ListCard>

      <Button variant="secondary" icon={LogOut} onPress={signOut}>
        Sign out
      </Button>

      <DangerZone onDeleted={signOut} onSignOut={signOut} />

      <Text size={12} color={c.ink3} center>
        {me.email} · FITR8 gives general fitness guidance, not medical advice.
      </Text>
      <Text size={12} color={c.ink3} center>
        <Text size={12} color={c.brandText} weight={600} onPress={() => openLegal("privacy")}>
          Privacy Policy
        </Text>
        {"  ·  "}
        <Text size={12} color={c.brandText} weight={600} onPress={() => openLegal("terms")}>
          Terms
        </Text>
      </Text>
    </Screen>
  );
}
