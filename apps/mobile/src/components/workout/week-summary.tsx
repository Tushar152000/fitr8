import type { TrainingWeekDto } from "@fitr8/contracts";
import { ChevronLeft, ChevronRight, HeartPulse, MessageCircle } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { GOAL_LABEL, kcalText, weekOf } from "@/lib/training";
import { makeStyles, useColors, radius } from "@/lib/theme";

const DAY_MS = 86_400_000;
const shiftWeek = (start: string, weeks: number) =>
  new Date(Date.parse(`${start}T00:00:00Z`) + weeks * 7 * DAY_MS).toISOString().slice(0, 10);

/**
 * Under "Up next", in the same white-card style: the week itself (arrows to the previous / next
 * week, "Back to this week", sessions, burn and ≈ fat), today's recovery score from the health apps,
 * and the coach's note on why the week looks like this.
 */
export function WeekSummary({ week, onWeek }: { week: TrainingWeekDto; onWeek: (start: string | null) => void }) {
  const c = useColors();
  const styles = useStyles();
  const thisWeek = week.days.some((d) => d.date === week.today);
  const isNext = week.start > week.today;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <View style={styles.nav}>
          <Arrow label="Previous week" onPress={() => onWeek(shiftWeek(week.start, -1))}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2} absoluteStrokeWidth />
          </Arrow>
          <PressableScale
            accessibilityRole="button"
            disabled={thisWeek}
            onPress={() => onWeek(null)}
            style={{ flex: 1, alignItems: "center", gap: 2 }}
          >
            <Text variant="bodyStrong" tabular>
              {thisWeek ? "This week" : isNext ? "Next week" : "Past week"} · {weekOf(week.start)}
            </Text>
            <Text variant="labelMedium" color={thisWeek ? c.ink2 : c.brandText}>
              {thisWeek ? GOAL_LABEL[week.goal] : "Back to this week"}
            </Text>
          </PressableScale>
          <Arrow label="Next week" disabled={isNext} onPress={() => onWeek(shiftWeek(week.start, 1))}>
            <ChevronRight size={18} color={c.ink} strokeWidth={2} absoluteStrokeWidth />
          </Arrow>
        </View>
        <View style={styles.stats}>
          <Figure label="Sessions" value={`${week.sessions} + rest`} />
          <Figure label="Burn this week" value={`${kcalText(week.totalKcal)} kcal`} />
          <Figure label="≈ extra fat" value={`${week.fatKg.toFixed(2)} kg`} />
        </View>
      </View>

      {week.recovery?.advice && (
        <View style={[styles.card, styles.noteRow]}>
          <HeartPulse size={18} color={c.cautionText} strokeWidth={2} absoluteStrokeWidth style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" color={c.cautionText}>
              Recovery {week.recovery.score}/100
            </Text>
            <Text variant="bodySm" color={c.ink2}>
              {week.recovery.advice}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.card, styles.noteRow]}>
        <MessageCircle size={18} color={c.brandText} strokeWidth={2} absoluteStrokeWidth style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">Why this week looks like this</Text>
          <Text variant="bodySm" color={c.ink2}>
            {week.coachNote}
          </Text>
        </View>
      </View>

      <Text variant="caption" color={c.ink3} center>
        Calories burned are estimates. Your food target already counts your training, so don&apos;t eat them back.
      </Text>
    </View>
  );
}

function Arrow({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.arrow, disabled && { opacity: 0.3 }]}
    >
      {children}
    </PressableScale>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="labelMedium" color={c.ink2}>
        {label}
      </Text>
      <Text variant="bodyStrong" tabular>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  nav: { flexDirection: "row", alignItems: "center", gap: 8 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: { flexDirection: "row", gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line },
  noteRow: { flexDirection: "row", gap: 10 },
}));
