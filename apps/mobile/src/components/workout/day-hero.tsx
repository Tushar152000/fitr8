import type { ComponentType } from "react";
import type { RestDayCardio, TrainingDayDto } from "@fitr8/contracts";
import { router } from "expo-router";
import {
  Activity,
  Bike,
  Check,
  CircleOff,
  Clock,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Gauge,
  ListOrdered,
  Moon,
  Repeat,
  Route,
  type LucideIcon,
} from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { PillButton, PressableScale, RunIcon, Text, type IconProps } from "@/components/ui";
import { openPremium } from "@/lib/premium";
import { readSession } from "@/lib/session-store";
import { Glow } from "@/components/ui/glow";
import { DAY_LABEL, kcalText } from "@/lib/training";
import { cardLabel, restChips, sessionHeadline } from "@/lib/training-copy";
import { makeStyles, useColors, radius } from "@/lib/theme";

const ON_DARK_BODY = "rgba(255,255,255,0.75)";
const ON_DARK_SUBTLE = "rgba(255,255,255,0.55)";

const TYPE_ICON: Record<TrainingDayDto["type"], ComponentType<IconProps>> = {
  gym: Dumbbell,
  run: RunIcon,
  hiit: Activity,
  yoga: Flower2,
  walk: Footprints,
  cycle: Bike,
  rest: Moon,
};

const REST_ICON = { time: Clock, steps: Footprints, hiit: CircleOff, often: Repeat } as const;

/** The one action for a day, as before the redesign (gym only on the day, in focus mode). */
function dayAction(day: TrainingDayDto, isToday: boolean): { label: string; onPress: () => void } | null {
  // A timed session left mid-way today: go straight back into it.
  if (isToday && day.type !== "gym" && day.type !== "rest" && readSession(day.date, day.type))
    return {
      label: "Resume session",
      onPress: () => router.push({ pathname: "/training/[date]", params: { date: day.date, start: "1" } }),
    };
  switch (day.type) {
    case "gym":
      return isToday ? { label: "Start workout", onPress: () => router.push("/workout-session") } : null;
    case "run":
    case "hiit":
      return { label: "See run details", onPress: () => router.push(`/training/${day.date}`) };
    case "cycle":
      return { label: "See ride details", onPress: () => router.push(`/training/${day.date}`) };
    case "yoga":
      return {
        label: day.title === "Mobility" ? "Start mobility" : "Start flow",
        onPress: () => router.push({ pathname: "/training/[date]", params: { date: day.date, start: "1" } }),
      };
    case "walk":
      return { label: "See walk plan", onPress: () => router.push(`/training/${day.date}`) };
    default:
      return null;
  }
}

/**
 * The selected day as Figma's dark "Recovery" card with its lime glow. Rest day: "Today’s recovery",
 * the rest-day cardio and its chips (the card opens the rest-day plan). Session day: "Today’s run",
 * minutes and effort, chips (kcal, exercises / distance / pace, done), the coach's why and the
 * day's action as a white pill.
 */
export function DayHero({
  day,
  today,
  restDay,
  preview = false,
  sampleDate = null,
}: {
  day: TrainingDayDto;
  today: string;
  restDay: RestDayCardio;
  /** Free preview: gym sessions other than the week's sample open the plans. */
  preview?: boolean;
  sampleDate?: string | null;
}) {
  const c = useColors();
  const styles = useStyles();
  const isToday = day.date === today;
  const Icon = TYPE_ICON[day.type];

  if (day.type === "rest") {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${cardLabel(day, isToday)}: ${restDay.activity}. See the rest-day plan`}
        onPress={() => router.push(`/training/${day.date}`)}
        style={styles.card}
      >
        <Glow tone="lime" opacity={0.7} left={6} bottom={-59} />
        <Head label={cardLabel(day, isToday)} title={restDay.activity} icon={Icon} />
        <View style={styles.chips}>
          {restChips(restDay).map((chip) => (
            <Chip key={chip.key} icon={REST_ICON[chip.key]} text={chip.text} />
          ))}
        </View>
      </PressableScale>
    );
  }

  const sample = preview && day.date === sampleDate;
  const base = dayAction(day, isToday);
  // Free preview: the sample session runs in full; other gym sessions unlock with Premium.
  const action =
    preview && day.type === "gym" && !sample
      ? { label: "Unlock this workout", onPress: () => openPremium("workouts") }
      : base && sample && day.type === "gym"
        ? { ...base, label: "Start free workout" }
        : base;
  const logged = day.logs.length > 0;
  const chips: { icon: LucideIcon; text: string }[] = [{ icon: Flame, text: `${kcalText(day.kcal)} kcal` }];
  if (day.gym && day.gym.exercises > 0) chips.push({ icon: ListOrdered, text: `${day.gym.exercises} exercises` });
  if (day.distanceKm) chips.push({ icon: Route, text: `~${day.distanceKm} km` });
  if (day.pace) chips.push({ icon: Gauge, text: day.pace });
  if (day.status === "done") chips.push({ icon: Check, text: "Done" });

  return (
    <View style={styles.card}>
      <Glow tone="lime" opacity={0.7} left={6} bottom={-59} />
      <Head
        label={sample ? `${cardLabel(day, isToday)} · Free this week` : cardLabel(day, isToday)}
        title={sessionHeadline(day)}
        icon={Icon}
      />
      <View style={styles.chips}>
        {chips.map((chip) => (
          <Chip key={chip.text} icon={chip.icon} text={chip.text} />
        ))}
      </View>
      <Text variant="bodySm" color={ON_DARK_BODY}>
        {day.why}
      </Text>
      {logged && (
        <Text variant="labelStrong" color={c.highlight}>
          Logged:{" "}
          {day.logs
            .map((l) => `${DAY_LABEL[l.type]} ${l.minutes} min${l.distanceKm ? `, ${l.distanceKm} km` : ""}`)
            .join(" · ")}
        </Text>
      )}
      {action ? (
        <PillButton variant="onDark" label={action.label} onPress={action.onPress} />
      ) : (
        <Text variant="labelMedium" color={ON_DARK_SUBTLE}>
          {day.date > today
            ? `Your ${day.title.toLowerCase()} session opens on ${day.weekday}.`
            : "Gym sessions are logged on the day."}
        </Text>
      )}
    </View>
  );
}

function Head({ label, title, icon: Icon }: { label: string; title: string; icon: ComponentType<IconProps> }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="labelMedium" color={c.white}>
          {label}
        </Text>
        <Text variant="heading1" color={c.white}>
          {title}
        </Text>
      </View>
      <View style={styles.icon}>
        <Icon size={18} color={c.white} strokeWidth={2} absoluteStrokeWidth />
      </View>
    </View>
  );
}

function Chip({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.chip}>
      <Icon size={12} color={c.white} strokeWidth={1.25} absoluteStrokeWidth />
      <Text variant="labelStrong" color={c.white} tabular>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  // Figma "Recovery": inverse surface (always dark), 20 px padding (hero card), 20 radius, card lift.
  // Dark mode: a faint edge (panelLine) so the near-black card keeps its shape on the black page.
  card: {
    gap: 14,
    padding: 20,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: c.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.panelLine,
    ...shadows.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.glassStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: c.glassStrong,
  },
}));
