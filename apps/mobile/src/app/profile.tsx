import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bell, CircleHelp, Ruler, Settings, Target, TrendingDown, Watch } from "lucide-react-native";
import { PlanCard } from "@/components/profile/plan-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePage } from "@/components/profile/profile-page";
import { MenuGroup, MenuRow, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { HEALTH_PLATFORM_NAME, healthConnection } from "@/components/health/status";
import { goalSummary, progressSummary, remindersSummary } from "@/lib/profile-summary";
import { healthStatusQuery, planQuery, progressQuery, remindersQuery } from "@/lib/queries";
import { appVersion } from "@/lib/support";
import { useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * Figma frame 8 "Profile": the hub. Header, the plan card, then MY PLAN (goal, progress,
 * measurements), PREFERENCES (reminders, apps & devices), SUPPORT (help, settings) and the version.
 * A root stack screen pushed from Home's avatar (no tab bar); the back button returns there.
 */
export default function ProfileScreen() {
  const c = useColors();
  const me = useMe();
  const plan = useQuery(planQuery);
  const progress = useQuery(progressQuery);
  const health = useQuery(healthStatusQuery);
  // Also keeps this phone's scheduled reminders in step (tabs layout shares the query).
  useQuery(remindersQuery);
  const pull = usePullRefresh(() => Promise.all([plan.refetch(), progress.refetch(), health.refetch()]));
  const profile = me.profile!;

  return (
    <ProfilePage title="My Profile" eyebrow={null} refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <ProfileHeader me={me} />

      <PlanCard pro={me.plan === "PRO"} />

      <MenuGroup label="My plan">
        <MenuRow
          icon={Target}
          title="Goal"
          subtitle={goalSummary(plan.data?.goal) ?? (plan.isPending ? " " : "Set your goal")}
          onPress={() => router.push("/goal")}
        />
        <MenuRow
          icon={TrendingDown}
          title="Progress"
          subtitle={progressSummary(progress.data) ?? " "}
          onPress={() => router.push("/progress")}
        />
        <MenuRow
          icon={Ruler}
          title="Measurements"
          subtitle="Weight, body fat, waist and more"
          onPress={() => router.push("/measurements")}
        />
      </MenuGroup>

      <MenuGroup label="Preferences">
        <MenuRow
          icon={Bell}
          title="Reminders"
          subtitle={remindersSummary(profile)}
          onPress={() => router.push("/reminders")}
        />
        <MenuRow
          icon={Watch}
          title="Apps & devices"
          subtitle={healthLine(health.data)}
          onPress={() => router.push("/health")}
        />
      </MenuGroup>

      <MenuGroup label="Support">
        <MenuRow
          icon={CircleHelp}
          title="Help & support"
          subtitle="FAQs, chat and feedback"
          onPress={() => router.push("/support")}
        />
        <MenuRow
          icon={Settings}
          title="Settings"
          subtitle="Account, units, notifications, privacy"
          onPress={() => router.push("/settings")}
        />
      </MenuGroup>

      <Text variant="caption" color={c.ink3} center>
        Fitr8 · Version {appVersion() ?? "–"}
      </Text>
    </ProfilePage>
  );
}

/** "Apple Health connected" for this phone's platform (any platform on the web preview). */
function healthLine(status: Parameters<typeof healthConnection>[0]): string {
  if (!status) return " ";
  const connection = healthConnection(status);
  return connection ? `${HEALTH_PLATFORM_NAME[connection.platform]} connected` : "Not connected";
}
