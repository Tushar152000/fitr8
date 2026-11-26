import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Heart, Watch } from "lucide-react-native";
import { ProfilePage } from "@/components/profile/profile-page";
import { QueryError } from "@/components/query-error";
import { MenuGroup, MenuRow, StatusPill } from "@/components/ui";
import { healthAppLabel, healthConnection } from "@/components/health/status";
import { healthStatusQuery } from "@/lib/queries";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * Figma frame 13 "Profile / Apps & devices": this phone's health app (Apple Health on iPhone,
 * Health Connect on Android) with its status, and wearables (coming soon). The health app row opens
 * the connection screen (connect, the numbers, sync, disconnect).
 */
export default function AppsDevicesScreen() {
  const status = useQuery(healthStatusQuery);
  const pull = usePullRefresh(() => status.refetch());
  const label = healthAppLabel();
  const connection = healthConnection(status.data);

  return (
    <ProfilePage
      title="Apps & devices"
      intro="Sync steps, workouts and weight automatically."
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      {status.isError ? <QueryError error={status.error} onRetry={() => status.refetch()} /> : null}
      <MenuGroup>
        <MenuRow
          icon={Heart}
          title={label}
          subtitle={connection || status.isPending ? "Steps, workouts and weight" : "Not connected"}
          trailing={connection ? <StatusPill label="Connected" /> : undefined}
          accessibilityLabel={`${label}, ${connection ? "connected" : "not connected"}`}
          onPress={() => router.push("/health/connect")}
        />
        <MenuRow
          icon={Watch}
          title="Wearables"
          subtitle="Garmin, Fitbit, Whoop"
          trailing={<StatusPill label="Coming soon" tone="neutral" icon={null} />}
        />
      </MenuGroup>
    </ProfilePage>
  );
}
