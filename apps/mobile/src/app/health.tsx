import { useQuery } from "@tanstack/react-query";
import { HeartPulse, Lock, RefreshCw, Settings2, Unlink } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { HealthMetrics, sleepText } from "@/components/health/metrics";
import { QueryError } from "@/components/query-error";
import { Button, Card, FieldError, Screen, Skeleton, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { useMe } from "@/lib/auth";
import { confirmAction } from "@/lib/confirm";
import { formatInt } from "@/lib/format";
import { healthAdapter, platformLabel } from "@/lib/health";
import { connectHealth, disconnectHealth, syncHealth } from "@/lib/health/sync";
import { healthStatusQuery, healthSummaryQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { showToast } from "@/lib/toast";
import { makeStyles, radius, useColors } from "@/lib/theme";

const HEALTH_CONNECT_STORE = "market://details?id=com.google.android.apps.healthdata";

/**
 * Apple Health / Health Connect: connect (explainer first, then the system screen), the six
 * numbers, sync now, and disconnect (optionally deleting everything FITR8 stored). Free for all.
 */
export default function HealthScreen() {
  const c = useColors();
  const styles = useStyles();
  const me = useMe();
  const adapter = healthAdapter();
  const label = adapter?.label ?? (Platform.OS === "ios" ? "Apple Health" : "Health Connect");
  const status = useQuery(healthStatusQuery);
  const connection = status.data?.connections.find((x) => x.platform === adapter?.platform);
  const summary = useQuery({ ...healthSummaryQuery, enabled: Boolean(connection) });
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Couldn't connect. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    setBusy("sync");
    setError(null);
    try {
      const r = await syncHealth(me.id, { force: true });
      showToast(r ? `Synced ${formatInt(r.samples)} new readings` : "Up to date");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sync. Try again.");
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
      setError(e instanceof Error ? e.message : "Couldn't disconnect. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshing={summary.isRefetching} onRefresh={connection ? () => void syncNow() : undefined}>
      <BackHeader />
      <View style={{ gap: 6 }}>
        <Text variant="meta">Health apps</Text>
        <Text variant="h1">{label}</Text>
      </View>

      {status.isPending ? (
        <Skeleton height={160} radius={radius.card} />
      ) : status.isError ? (
        <QueryError error={status.error} onRetry={() => status.refetch()} />
      ) : !adapter ? (
        <Card>
          <Text color={c.ink2}>
            Health apps connect from the FITR8 app on your phone (iPhone: Apple Health, Android: Health Connect).
          </Text>
        </Card>
      ) : !connection ? (
        <>
          <Card style={{ gap: 14 }}>
            <View style={styles.iconTile}>
              <HeartPulse size={22} color={c.white} />
            </View>
            <Text variant="h2">See your health data next to your food</Text>
            <Text color={c.ink2}>
              Connect {label} and FITR8 shows your steps, heart rate, BMI, blood oxygen, sleep and recovery, and your
              coach adjusts your training to how you slept.
            </Text>
            <View style={{ gap: 8 }}>
              {[
                "Read only: FITR8 never changes your health data",
                "Saved securely to your FITR8 account, never sold or used for ads",
                "Disconnect or delete it all at any time",
              ].map((line) => (
                <View key={line} style={{ flexDirection: "row", gap: 8 }}>
                  <Lock size={14} color={c.protein} style={{ marginTop: 3 }} />
                  <Text size={14} color={c.ink2} style={{ flex: 1 }}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
            <Text size={12} color={c.ink3}>
              On the next screen, {label} asks which data to share. Allow what you&apos;re comfortable with; FITR8 works
              with any of it.
            </Text>
          </Card>
          {error && <FieldError>{error}</FieldError>}
          <Button onPress={connect} loading={busy === "connect"}>
            {`Connect ${label}`}
          </Button>
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={styles.dot} />
            <Text size={13} color={c.ink2} style={{ flex: 1 }}>
              Connected
              {connection.lastSyncAt
                ? ` · synced ${new Date(connection.lastSyncAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}`
                : " · syncing…"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sync now"
              onPress={syncNow}
              disabled={busy === "sync"}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <RefreshCw size={20} color={busy === "sync" ? c.ink3 : c.brandText} />
            </Pressable>
          </View>

          {summary.isPending ? (
            <Skeleton height={260} radius={radius.card} />
          ) : summary.isError ? (
            <QueryError error={summary.error} onRetry={() => summary.refetch()} />
          ) : (
            <>
              <HealthMetrics s={summary.data} />
              {summary.data.recovery && (
                <Card>
                  <Text weight={700}>Why your recovery is {summary.data.recovery.score}</Text>
                  {summary.data.recovery.reasons.map((r) => (
                    <Text key={r} size={14} color={c.ink2}>
                      • {r}
                    </Text>
                  ))}
                  <Text size={12} color={c.ink3}>
                    An estimate from sleep, resting heart rate and heart-rate variability against your own usual. Not
                    medical advice.
                  </Text>
                </Card>
              )}
              {summary.data.sleep && (
                <Card>
                  <Text weight={700}>Last night</Text>
                  <Text size={14} color={c.ink2} tabular>
                    {sleepText(summary.data.sleep.asleepMinutes)} asleep of {sleepText(summary.data.sleep.inBedMinutes)}{" "}
                    in bed
                  </Text>
                  {(summary.data.sleep.deepMinutes > 0 || summary.data.sleep.remMinutes > 0) && (
                    <Text size={14} color={c.ink2} tabular>
                      Deep {sleepText(summary.data.sleep.deepMinutes)} · REM {sleepText(summary.data.sleep.remMinutes)}{" "}
                      · Light {sleepText(summary.data.sleep.lightMinutes)}
                    </Text>
                  )}
                </Card>
              )}
              {summary.data.steps && (
                <Card>
                  <Text weight={700}>Steps this week</Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {summary.data.steps.week.map((d) => {
                      const max = Math.max(
                        summary.data.steps!.goal,
                        ...summary.data.steps!.week.map((w) => w.count ?? 0),
                      );
                      return (
                        <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                          <View
                            accessibilityLabel={`${d.date}: ${d.count ?? "no"} steps`}
                            style={{
                              width: "70%",
                              height: Math.max(2, ((d.count ?? 0) / max) * 60),
                              borderRadius: 4,
                              backgroundColor: (d.count ?? 0) >= summary.data.steps!.goal ? c.protein : c.lineStrong,
                            }}
                          />
                          <Text size={10} color={c.ink3}>
                            {new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" }).format(
                              new Date(`${d.date}T00:00:00Z`),
                            )}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              )}
            </>
          )}

          {error && <FieldError>{error}</FieldError>}
          <View style={{ borderRadius: radius.card, backgroundColor: c.surface }}>
            <Row icon={Settings2} label={`Choose what ${label} shares`} onPress={() => adapter.openSettings()} />
            <Row icon={Unlink} label="Disconnect" onPress={() => disconnect(false)} disabled={busy === "disconnect"} />
            <Row
              icon={Unlink}
              label="Disconnect and delete synced data"
              danger
              onPress={() => disconnect(true)}
              disabled={busy === "disconnect"}
            />
          </View>
          <Text size={12} color={c.ink3} center>
            {formatInt(status.data.samples)} readings saved to your account.
          </Text>
        </>
      )}
    </Screen>
  );
}

function Row({
  icon: Icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: typeof Unlink;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? c.sunken : "transparent",
        borderRadius: radius.card,
      })}
    >
      <Icon size={18} color={danger ? c.danger : c.ink2} />
      <Text weight={600} color={danger ? c.danger : c.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.fat,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.protein },
}));
