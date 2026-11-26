import type { TrainingDayDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { loadLabel, setsLabel } from "@/lib/training-copy";
import { fade, makeStyles, useColors } from "@/lib/theme";

/**
 * Figma "Up next": a heading (eyebrow + session title, the "Coach briefing" link when the week has
 * gym days) over the session's numbered list: a gym day's exercises (sets × reps, kg or
 * Bodyweight), any other day's steps in the same rows. Also used for the selected gym day's own
 * list ("Today · Upper body B").
 */
export function SessionList({
  day,
  eyebrow,
  briefing = false,
}: {
  day: TrainingDayDto;
  eyebrow: string;
  briefing?: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  const rows = day.exercises?.length
    ? day.exercises.map((e) => ({ name: e.name, sub: null, right: setsLabel(e), rightSub: loadLabel(e) }))
    : day.steps.map((s) => ({ name: s.name, sub: s.detail, right: null, rightSub: null }));

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="labelStrong" color={c.ink2}>
            {eyebrow}
          </Text>
          <Text variant="heading2" numberOfLines={1}>
            {day.title}
          </Text>
        </View>
        {briefing && (
          <PressableScale accessibilityRole="link" onPress={() => router.push("/briefing")} hitSlop={10}>
            <Text variant="bodyStrong" color={c.brandText}>
              Coach briefing
            </Text>
          </PressableScale>
        )}
      </View>

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((r, i) => (
            <View key={`${r.name}-${i}`} style={[styles.row, i < rows.length - 1 && styles.divider]}>
              <View style={styles.badge}>
                <Text variant="captionStrong" color={fade(c.ink, 0.7)}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={r.sub ? 2 : 1}>
                  {r.name}
                </Text>
                {r.sub && (
                  <Text variant="labelMedium" color={c.ink2}>
                    {r.sub}
                  </Text>
                )}
              </View>
              {r.right && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text weight={600} size={13} tabular>
                    {r.right}
                  </Text>
                  <Text weight={500} size={11} color={fade(c.ink, 0.5)} tabular>
                    {r.rightSub}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  head: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  list: { paddingHorizontal: 16, paddingVertical: 2, borderRadius: 20, backgroundColor: c.surface, ...shadows.card },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, minHeight: 51 },
  divider: { borderBottomWidth: 1, borderBottomColor: c.line },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
}));
