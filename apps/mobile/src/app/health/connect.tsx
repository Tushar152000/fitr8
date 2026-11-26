import { useQuery } from "@tanstack/react-query";
import { Smartphone } from "lucide-react-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import { ConnectIntro } from "@/components/health/connect-intro";
import { ConnectionActions } from "@/components/health/connection-actions";
import { HealthDetails } from "@/components/health/details";
import { HEALTH_PLATFORM_NAME, healthAppLabel, healthConnection } from "@/components/health/status";
import { ProfilePage } from "@/components/profile/profile-page";
import { QueryError } from "@/components/query-error";
import { Card, FieldError, IconTile, PillButton, Skeleton, StatusPill, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { errorMessage } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { confirmAction } from "@/lib/confirm";
import { formatInt } from "@/lib/format";
import { healthAdapter, platformLabel } from "@/lib/health";
import { connectHealth, disconnectHealth, syncHealth } from "@/lib/health/sync";
import { healthStatusQuery, healthSummaryQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { showToast } from "@/lib/toast";
import { radius, useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

const HEALTH_CONNECT_STORE = "market://details?id=com.google.android.apps.healthdata";

/**
 * Apps & devices → Apple Health / Health Connect: connect (explainer first, then the system
 * screen), the six numbers, sync now, and disconnect (optionally deleting everything FITR8 stored).
 * Free for all. On the web preview there is no health app: it explains that, and shows the numbers
 * read-only when the account connected from a phone.
 */
export default function HealthConnectScreen() {
  const c = useColors();
  const me = useMe();
  const adapter = healthAdapter();
  const status = useQuery(healthStatusQuery);
  const connection = healthConnection(status.data);
  // The web preview has no health app: name the connected one, else a generic title.
  const label = adapter ? healthAppLabel() : connection ? HEALTH_PLATFORM_NAME[connection.platform] : "Health apps";
  const summary = useQuery({ ...healthSummaryQuery, enabled: Boolean(connection) });
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pull = usePullRefresh(() => (adapter ? syncNow() : status.refetch()));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["health"] });

  async function connect() {
    if (!adapter) return;
    setBusy("connect");
    setError(null);
    try {
      const res = await connectHealth(me.id);
      if (!res.ok) {
        if (res.reason === "needs_install") {
          setError(`Install or update ${label} from the Play Store, then come back.`);
          void Linking.openURL(HEALTH_CONNECT_STORE).catch(() => {});
        } else if (res.reason === "denied") setError(`Nothing was allowed. You can allow access any time in ${label}.`);
        else setError(`${label} isn't available on this phone.`);
        return;
      }
      track("health_connected", { platform: platformLabel(adapter.platform) });
      showToast(`${label} connected`);
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Couldn't connect. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    setBusy("sync");
    setError(null);
    try {
      const r = await syncHealth(me.id, { force: true });
      showToast(r ? `Synced ${formatInt(r.samples)} new readings` : "Up to date", 3000, true);
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Couldn't sync. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(deleteData: boolean) {
    const ok = await confirmAction(
      deleteData ? "Disconnect and delete?" : `Disconnect ${label}?`,
      deleteData
        ? `FITR8 stops syncing and deletes every reading it saved from ${label}. Your data in ${label} itself stays.`
        : `FITR8 stops syncing. What was already synced stays in your account until you delete it.`,
      deleteData ? "Delete" : "Disconnect",
    );
    if (!ok) return;
    setBusy("disconnect");
    setError(null);
    try {
      await disconnectHealth(me.id, deleteData);
      if (adapter)
        track("health_disconnected", { platform: platformLabel(adapter.platform), deleted_data: deleteData });
      showToast(deleteData ? "Disconnected and deleted" : "Disconnected");
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Couldn't disconnect. Try again."));
    } finally {
      setBusy(null);
    }
  }

  const numbers = summary.isPending ? (
    <Skeleton height={260} radius={radius.card} />
  ) : summary.isError ? (
    <QueryError error={summary.error} onRetry={() => summary.refetch()} />
  ) : (
    <HealthDetails s={summary.data} />
  );

  return (
    <ProfilePage
      title={label}
      eyebrow="Apps & devices"
      refreshing={pull.refreshing}
      onRefresh={connection ? pull.onRefresh : undefined}
      footer={
        adapter && status.isSuccess && !connection ? (
          <PillButton label={`Connect ${label}`} onPress={connect} loading={busy === "connect"} />
        ) : undefined
      }
    >
      {status.isPending ? (
        <Skeleton height={160} radius={radius.card} />
      ) : status.isError ? (
        <QueryError error={status.error} onRetry={() => status.refetch()} />
      ) : !adapter ? (
        <>
          <Card style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <IconTile icon={Smartphone} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyStrong">{connection ? "Manage it on your phone" : "Connect on your phone"}</Text>
              <Text variant="bodySm" color={c.ink2}>
                {connection
                  ? `Syncing, what ${label} shares and disconnecting are in the FITR8 app on your phone.`
                  : "Health apps connect from the FITR8 app on your phone: Apple Health on iPhone, Health Connect on Android."}
              </Text>
            </View>
          </Card>
          {connection && numbers}
        </>
      ) : !connection ? (
        <>
          <ConnectIntro label={label} />
          {error && <FieldError>{error}</FieldError>}
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row" }}>
            <StatusPill label="Connected" />
          </View>
          {numbers}
          {error && <FieldError>{error}</FieldError>}
          <ConnectionActions
            label={label}
            lastSyncAt={connection.lastSyncAt}
            syncing={busy === "sync"}
            disconnecting={busy === "disconnect"}
            onSync={() => void syncNow()}
            onOpenSettings={() => adapter.openSettings()}
            onDisconnect={(d) => void disconnect(d)}
          />
          <Text variant="caption" color={c.ink3} center>
            {formatInt(status.data.samples)} readings saved to your account.
          </Text>
        </>
      )}
    </ProfilePage>
  );
}
