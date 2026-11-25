import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ChevronRight, HeartPulse, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { PressableScale, Skeleton, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { healthAdapter } from "@/lib/health";
import { healthStatusQuery, healthSummaryQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { HealthMetrics } from "./metrics";

const HIDE_KEY = (userId: string) => `fitr8.health.prompt.hidden.${userId}`;

/**
 * Today's health numbers (steps, heart rate, BMI, SpO2, sleep, recovery) once Apple Health /
 * Health Connect is connected; before that, one small prompt that can be hidden for good.
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

  if (!adapter || !status.data) return null;

  if (!connected) {
    if (hidden !== false) return null;
    return (
      <PressableScale accessibilityRole="button" onPress={() => router.push("/health")} style={styles.prompt}>
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

  return (
    <View style={{ gap: 10 }}>
      <PressableScale
        accessibilityRole="link"
        onPress={() => router.push("/health")}
        style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}
      >
        <Text variant="h2" style={{ flex: 1 }}>
          Health
        </Text>
        <Text size={14} weight={600} color={c.brandText}>
          {adapter.label}
        </Text>
        <ChevronRight size={18} color={c.brandText} />
      </PressableScale>
      {summary.data ? <HealthMetrics s={summary.data} /> : <Skeleton height={250} radius={radius.card} />}
    </View>
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
