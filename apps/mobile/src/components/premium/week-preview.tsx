import { Dumbbell, Leaf, Lock, Moon } from "lucide-react-native";
import { View } from "react-native";
import { RunIcon, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** A sample week (not the user's plan; the real one is built on the Workout tab). */
const SAMPLE_WEEK = [
  { day: "M", kind: "Gym", icon: Dumbbell },
  { day: "T", kind: "Run", icon: RunIcon },
  { day: "W", kind: "Rest", icon: Moon },
  { day: "T", kind: "Yoga", icon: Leaf },
  { day: "F", kind: "Gym", icon: Dumbbell },
  { day: "S", kind: "Run", icon: RunIcon },
  { day: "S", kind: "Rest", icon: Moon },
] as const;

/**
 * A week of workout tiles (Gym · Run · Rest · Yoga) as a preview of the AI plan. `locked` fades it
 * under a "Built for you with Premium" pill (Home's workout card); the paywall shows it clear.
 */
export function WeekPreview({ locked = false }: { locked?: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.week} accessible accessibilityLabel="A sample week: gym, run, rest, yoga, gym, run, rest">
      {SAMPLE_WEEK.map((d, i) => {
        const Icon = d.icon;
        const rest = d.kind === "Rest";
        return (
          <View key={i} style={[styles.day, locked && { opacity: 0.55 }]}>
            <Text variant="caption" color={c.ink3}>
              {d.day}
            </Text>
            <View style={[styles.tile, { backgroundColor: rest ? c.ground : c.brandSoft }]}>
              <Icon size={16} color={rest ? c.ink3 : c.brandText} strokeWidth={2} />
            </View>
            <Text variant="caption" color={rest ? c.ink3 : c.ink2} numberOfLines={1}>
              {d.kind}
            </Text>
          </View>
        );
      })}
      {locked && (
        <View style={styles.veil} pointerEvents="none">
          <View style={styles.lockPill}>
            <Lock size={12} color={c.ink} strokeWidth={2.4} />
            <Text variant="captionStrong">Built for you with Premium</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  week: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  day: { alignItems: "center", gap: 6, width: 40 },
  tile: { width: 36, height: 36, borderRadius: radius.tile, alignItems: "center", justifyContent: "center" },
  veil: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: c.surface,
    ...shadows.card,
  },
}));
