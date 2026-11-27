import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bell, CircleHelp, Moon, Ruler, Settings, Target, TrendingDown, UserPlus, Watch } from "lucide-react-native";
import { PlanCard } from "@/components/profile/plan-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePage } from "@/components/profile/profile-page";
import { MenuGroup, MenuRow, StatusPill, Switch, Text } from "@/components/ui";
import { useRef, type ComponentRef } from "react";
import { View } from "react-native";
import { useMe } from "@/lib/auth";
import { HEALTH_PLATFORM_NAME, healthConnection } from "@/components/health/status";
import { goalSummary, progressSummary, remindersSummary } from "@/lib/profile-summary";
import { healthStatusQuery, planQuery, progressQuery, remindersQuery } from "@/lib/queries";
import { inviteFriend } from "@/lib/invite";
import { appVersion } from "@/lib/support";
import { useAppearance, useColors } from "@/lib/theme";
import { revealScheme } from "@/components/theme-reveal";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * Figma frame 8 "Profile": the hub. Header, the plan card, then MY PLAN (goal, progress,
 * measurements), PREFERENCES (reminders, dark mode switch, apps & devices, settings), SUPPORT (help,
 * invite a friend) and the version.
 * Copy pass (user request 2026-11-28): the same icon tile on every row (grey in light, plain black in dark), each row says what it holds or
 * what to do next, and live state sits on the right (reminders "2 of 3 on", health "Connected").
 * A root stack screen pushed from Home's avatar (no tab bar); the back button returns there.
 */
export default function ProfileScreen() {
  const c = useColors();
  const me = useMe();
  const { preference, scheme } = useAppearance();
  const switchRef = useRef<ComponentRef<typeof View>>(null);

  /** Flip the theme with the circular reveal, starting from the switch. */
  const toggleDark = (on: boolean) => {
    const to = on ? "dark" : "light";
    const start = (x: number, y: number) => revealScheme(to, to, { x, y });
    if (switchRef.current) switchRef.current.measureInWindow((x, y, w, h) => start(x + w / 2, y + h / 2));
    else start(0, 0);
  };
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
          solidDark
          title="Goal"
          subtitle={goalSummary(plan.data?.goal) ?? (plan.isPending ? " " : "Set a goal to get your daily targets")}
          onPress={() => router.push("/goal")}
        />
        <MenuRow
          icon={TrendingDown}
          solidDark
          title="Progress"
          subtitle={progressSummary(progress.data) ?? " "}
          onPress={() => router.push("/progress")}
        />
        <MenuRow
          icon={Ruler}
          solidDark
          title="Measurements"
          subtitle="Log weight, body fat, waist and more"
          onPress={() => router.push("/measurements")}
        />
      </MenuGroup>

      <MenuGroup label="Preferences">
        <MenuRow
          icon={Bell}
          solidDark
          title="Reminders"
          subtitle="Meals, water and weekly weigh-ins"
          value={remindersSummary(profile)}
          onPress={() => router.push("/reminders")}
        />
        {/* A quick switch; Settings → Appearance still offers "System". */}
        <MenuRow
          icon={Moon}
          solidDark
          title="Dark mode"
          subtitle={preference === "system" ? "Following your phone's setting" : "Easier on the eyes at night"}
          trailing={
            <View ref={switchRef} collapsable={false}>
              <Switch label="Dark mode" checked={scheme === "dark"} onChange={toggleDark} />
            </View>
          }
        />
        <MenuRow
          icon={Watch}
          solidDark
          title="Apps & devices"
          subtitle={healthLine(health.data)}
          trailing={
            health.data ? (
              healthConnection(health.data) ? (
                <StatusPill label="Connected" />
              ) : (
                <StatusPill label="Off" icon={null} tone="neutral" />
              )
            ) : null
          }
          onPress={() => router.push("/health")}
        />
        <MenuRow
          icon={Settings}
          solidDark
          title="Settings"
          subtitle="Account, units, notifications and privacy"
          onPress={() => router.push("/settings")}
        />
      </MenuGroup>

      <MenuGroup label="Support">
        <MenuRow
          icon={CircleHelp}
          solidDark
          title="Help & support"
          subtitle="FAQs, chat with us or send feedback"
          onPress={() => router.push("/support")}
        />
        <MenuRow
          icon={UserPlus}
          solidDark
          title="Invite a friend"
          subtitle="Share FITR8 with someone who'd love it"
          onPress={() => void inviteFriend()}
        />
      </MenuGroup>

      <Text variant="caption" color={c.ink3} center>
        FITR8 · Version {appVersion() ?? "–"}
      </Text>
    </ProfilePage>
  );
}

/** "Syncing with Apple Health" for this phone's platform (any platform on the web preview). */
function healthLine(status: Parameters<typeof healthConnection>[0]): string {
  if (!status) return " ";
  const connection = healthConnection(status);
  return connection
    ? `Syncing with ${HEALTH_PLATFORM_NAME[connection.platform]}`
    : "Connect to bring in steps, sleep and workouts";
}
