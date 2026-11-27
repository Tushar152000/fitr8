import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { HeartPulse, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { PressableScale, Skeleton, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { healthAdapter } from "@/lib/health";
import { healthStatusQuery, healthSummaryQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { HealthHighlights } from "./highlights";
import { sampleHealthSummary } from "./sample";

const HIDE_KEY = (userId: string) => `fitr8.health.prompt.hidden.${userId}`;

/**
 * Home's health card once Apple Health / Health Connect is connected (`HealthHighlights`: recovery,
 * steps, sleep, resting HR; tap for all six numbers); before that, one small prompt that can be
 * hidden for good.
 * Development builds only (`__DEV__`: Expo Go, local runs) show the section with sample numbers and
 * a "Sample data" tag while nothing is connected, to preview the design (user request 2026-11-28).
 */
export function HealthTodayCard() {
  const c = useColors();
  const styles = useStyles();
  const me = useMe();
  const adapter = healthAdapter();
  const status = useQuery({ ...healthStatusQuery, enabled: adapter != null });
  const connected = Boolean(adapter && status.data?.connections.some((x) => x.platform === adapter.platform));
  const summary = useQuery({ ...healthSummaryQuery, enabled: connected });
  const [hidden, setHidden] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const v =
          Platform.OS === "web"
            ? globalThis.localStorage?.getItem(HIDE_KEY(me.id))
            : await SecureStore.getItemAsync(HIDE_KEY(me.id));
        setHidden(v === "1");
      } catch {
        setHidden(false);
      }
    })();
  }, [me.id]);

  if (__DEV__ && !connected)
    return <HealthHighlights s={sampleHealthSummary()} source={adapter?.label ?? "Apple Health"} sample />;
  if (!adapter || !status.data) return null;

  if (!connected) {
    if (hidden !== false) return null;
    return (
      <PressableScale accessibilityRole="button" onPress={() => router.push("/health/connect")} style={styles.prompt}>
        <View style={styles.icon}>
          <HeartPulse size={18} color={c.white} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight={700}>Connect {adapter.label}</Text>
          <Text size={13} color={c.ink2}>
            See steps, sleep, heart rate and recovery here.
          </Text>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Hide this"
          hitSlop={8}
          onPress={async () => {
            setHidden(true);
            try {
              if (Platform.OS === "web") globalThis.localStorage?.setItem(HIDE_KEY(me.id), "1");
              else await SecureStore.setItemAsync(HIDE_KEY(me.id), "1");
            } catch {
              // Shows again next launch at worst.
            }
          }}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", margin: -10 }}
        >
          <X size={18} color={c.ink3} />
        </PressableScale>
      </PressableScale>
    );
  }

  return summary.data ? (
    <HealthHighlights s={summary.data} source={adapter.label} />
  ) : (
    <Skeleton height={168} radius={radius.card} />
  );
}

const useStyles = makeStyles((c) => ({
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: c.surface,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.fat,
    alignItems: "center",
    justifyContent: "center",
  },
}));
