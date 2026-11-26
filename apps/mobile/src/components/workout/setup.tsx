import type { TrainingStateDto, TrainingType, TrainingWeekDto } from "@fitr8/contracts";
import { Check } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { Button, FieldError, PageHeader, PressableScale, Screen, Segmented, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { handlePremiumError } from "@/lib/premium";
import { queryClient } from "@/lib/query";
import { ACTIVITY_LABEL, GOAL_LABEL, setupSummary, TRAINING_CHOICES } from "@/lib/training";
import { makeStyles, radius, useColors } from "@/lib/theme";

const DAYS = [3, 4, 5, 6] as const;
const MINUTES = [30, 45, 60] as const;

/**
 * 16b: set up training. Onboarding answers are prefilled and shown read-only; we only ask how they
 * like to train, how many days and how long. "Build my week" saves and lands on the week (16c).
 */
export function TrainingSetup({
  state,
  onDone,
  onBack,
}: {
  state: TrainingStateDto;
  onDone: (week: TrainingWeekDto) => void;
  /** Shown when editing an existing setup. */
  onBack?: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const [types, setTypes] = useState<TrainingType[]>(state.defaults.types);
  const [days, setDays] = useState<number>(state.defaults.daysPerWeek);
  const [minutes, setMinutes] = useState<number>(state.defaults.sessionMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (t: TrainingType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function build() {
    if (!types.length) return setError("Pick at least one way to train.");
    setBusy(true);
    setError(null);
    try {
      // Keep the spec's order whatever the tap order was.
      const ordered = TRAINING_CHOICES.map((o) => o.value).filter((t) => types.includes(t));
      const week = await api<TrainingWeekDto>("/api/training/profile", {
        json: { types: ordered, daysPerWeek: days, sessionMinutes: minutes },
      });
      track("training_profile_saved", { types: ordered.join(","), days, minutes });
      queryClient.setQueryData(["training", "week", "current"], week);
      await queryClient.invalidateQueries({ queryKey: ["training"] });
      // The gym days moved: the strength session and Today's training-day bits change too.
      void queryClient.invalidateQueries({ queryKey: ["workout"] });
      void queryClient.invalidateQueries({ queryKey: ["water"] });
      onDone(week);
    } catch (e) {
      if (!handlePremiumError(e)) setError(errorMessage(e, "Couldn't build your week. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const s = state.summary;
  return (
    <Screen
      tabBar={!onBack}
      footer={
        <View style={{ gap: 10 }}>
          <Text variant="labelMedium" color={c.ink2} center>
            {types.length
              ? setupSummary(
                  TRAINING_CHOICES.map((o) => o.value).filter((t) => types.includes(t)),
                  days,
                  minutes,
                )
              : "Pick at least one way to train."}
          </Text>
          <Button onPress={build} loading={busy} disabled={!types.length}>
            {onBack ? "Rebuild my week" : "Build my week"}
          </Button>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        {onBack ? (
          <PageHeader onBack={onBack} eyebrow="Premium · Workouts" title="Set up your training" />
        ) : (
          // First setup, on the Workout tab itself: the tab's own header (no back).
          <View style={{ gap: 2 }}>
            <Text variant="labelStrong" color={c.ink2}>
              Premium · Workouts
            </Text>
            <Text variant="title" accessibilityRole="header">
              Set up your training
            </Text>
          </View>
        )}
        <Text variant="bodySm" color={c.ink2}>
          We already know your goal. Just tell us how you like to move.
        </Text>
      </View>

      <View style={styles.summary}>
        {[
          ["Goal", GOAL_LABEL[s.goal]],
          ["Weight", s.weightKg != null ? `${s.weightKg} kg` : "–"],
          ["Activity", ACTIVITY_LABEL[s.activityLevel] ?? s.activityLevel],
        ].map(([label, value]) => (
          <View key={label} style={{ flex: 1, gap: 2 }}>
            <Text variant="labelMedium" color={c.ink2}>
              {label}
            </Text>
            <Text variant="bodyStrong" numberOfLines={1} tabular>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Group title="How do you like to train?" hint="Pick one or more.">
        <View style={styles.grid} accessibilityRole="list">
          {TRAINING_CHOICES.map((o) => {
            const on = types.includes(o.value);
            return (
              <PressableScale
                key={o.value}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${o.label}: ${o.line}`}
                onPress={() => toggle(o.value)}
                style={[styles.choice, on && styles.choiceOn]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text variant="bodyStrong">{o.label}</Text>
                  <View style={[styles.tick, on && { backgroundColor: c.brand, borderColor: c.brand }]}>
                    {on && <Check size={14} color={c.white} strokeWidth={3} />}
                  </View>
                </View>
                <Text variant="labelRegular" color={c.ink2}>
                  {o.line}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Group>

      <Group title="Days a week">
        <Segmented
          label="Days a week"
          options={DAYS.map((d) => ({ value: d, label: String(d) }))}
          value={days as (typeof DAYS)[number]}
          onChange={setDays}
        />
      </Group>

      <Group title="Time per session">
        <Segmented
          label="Time per session"
          options={MINUTES.map((m) => ({ value: m, label: `${m} min` }))}
          value={minutes as (typeof MINUTES)[number]}
          onChange={setMinutes}
        />
      </Group>
      {error && <FieldError>{error}</FieldError>}
    </Screen>
  );
}

/** A titled question (Heading/H3) with an optional hint, 10 px over its control. */
function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text variant="heading3" accessibilityRole="header">
          {title}
        </Text>
        {hint ? (
          <Text variant="labelRegular" color={c.ink2}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  summary: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choice: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 72,
    gap: 4,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: c.surface,
    ...shadows.card,
  },
  choiceOn: { borderColor: c.brand, backgroundColor: c.brandSoft },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: c.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
}));
