import type { TrainingStateDto, TrainingType, TrainingWeekDto } from "@fitr8/contracts";
import {
  Activity,
  Bike,
  CalendarDays,
  Check,
  Clock,
  Dumbbell,
  Flower2,
  Footprints,
  HeartPulse,
  House,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import {
  Button,
  FieldError,
  PageHeader,
  PressableScale,
  RunIcon,
  Screen,
  Segmented,
  Text,
  type IconProps,
} from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { handlePremiumError } from "@/lib/premium";
import { monthYear } from "@/lib/profile-summary";
import { queryClient } from "@/lib/query";
import { GOAL_LABEL, TRAINING_CHOICES } from "@/lib/training";
import { makeStyles, radius, useColors } from "@/lib/theme";

const DAYS = [3, 4, 5, 6] as const;
const MINUTES = [30, 45, 60] as const;
/** One checklist line every STEP_MS; the last waits for the real build. */
const STEP_MS = 560;
/** The week's slots fill one after another, then the reveal follows. */
const SLOT_MS = 90;
const REVEAL_PAUSE_MS = 650;

const TYPE_ICON: Record<TrainingType, ComponentType<IconProps>> = {
  gym: Dumbbell,
  run: RunIcon,
  yoga: Flower2,
  walk: Footprints,
  home: House,
  cycle: Bike,
};
const EXPERIENCE_LABEL = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" } as const;
const EQUIPMENT_LABEL = { FULL_GYM: "Full gym", DUMBBELLS: "Dumbbells", BODYWEIGHT: "Bodyweight only" } as const;
const EQUIPMENT_SHORT = { FULL_GYM: "a full gym", DUMBBELLS: "dumbbells", BODYWEIGHT: "bodyweight" } as const;

type Step = "know" | "move" | "building" | "ready";

/**
 * 16b: set up training (redesign 2026-11-28, user request), four steps built on onboarding:
 * 1. "We already know you": chips from onboarding (goal + target, experience, equipment, injuries),
 *    and days / minutes prefilled from onboarding (tap to change).
 * 2. "How do you like to move?": picture tiles, preselected from onboarding.
 * 3. "Building your plan…": seven day slots shimmer, a bar fills and a checklist from their own
 *    answers ticks; the last step waits for the real save, then the slots snap into the real days.
 * 4. "Your week is ready": the week's days pop in, with the plan's why; "Start my week" lands on it.
 * Reduce Motion: no staggered animation (steps still tick).
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
  const [step, setStep] = useState<Step>("know");
  const [types, setTypes] = useState<TrainingType[]>(state.defaults.types);
  const [days, setDays] = useState<number>(state.defaults.daysPerWeek);
  const [minutes, setMinutes] = useState<number>(state.defaults.sessionMinutes);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<TrainingWeekDto | null>(null);

  const ordered = TRAINING_CHOICES.map((o) => o.value).filter((t) => types.includes(t));
  const toggle = (t: TrainingType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function build() {
    if (!types.length) return setError("Pick at least one way to train.");
    setError(null);
    setWeek(null);
    setStep("building");
    try {
      const built = await api<TrainingWeekDto>("/api/training/profile", {
        json: { types: ordered, daysPerWeek: days, sessionMinutes: minutes },
      });
      track("training_profile_saved", { types: ordered.join(","), days, minutes });
      queryClient.setQueryData(["training", "week", "current"], built);
      // The building screen finishes its last step, fills the week, then calls back for the reveal.
      setWeek(built);
    } catch (e) {
      setStep("move");
      if (!handlePremiumError(e)) setError(errorMessage(e, "Couldn't build your week. Try again."));
    }
  }

  async function finish() {
    if (!week) return;
    await queryClient.invalidateQueries({ queryKey: ["training"] });
    // The gym days moved: the strength session and Today's training-day bits change too.
    void queryClient.invalidateQueries({ queryKey: ["workout"] });
    void queryClient.invalidateQueries({ queryKey: ["water"] });
    onDone(week);
  }

  const header = (title: string, line: string) => (
    <View style={{ gap: 6 }}>
      {onBack ? (
        <PageHeader onBack={step === "move" ? () => setStep("know") : onBack} eyebrow="Workouts" title={title} />
      ) : (
        <View style={{ gap: 2 }}>
          <Text variant="labelStrong" color={c.ink2}>
            {step === "know" ? "Step 1 of 2" : "Step 2 of 2"}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
        </View>
      )}
      <Text variant="bodySm" color={c.ink2}>
        {line}
      </Text>
    </View>
  );

  if (step === "building")
    return (
      <Screen tabBar={!onBack}>
        <Building
          state={state}
          types={ordered}
          days={days}
          minutes={minutes}
          week={week}
          onComplete={() => setStep("ready")}
        />
      </Screen>
    );

  if (step === "ready" && week)
    return (
      <Screen tabBar={!onBack} footer={<Button onPress={() => void finish()}>Start my week</Button>}>
        <Ready week={week} />
      </Screen>
    );

  if (step === "move")
    return (
      <Screen
        tabBar={!onBack}
        footer={
          <View style={{ gap: 8 }}>
            {error && <FieldError>{error}</FieldError>}
            <Button onPress={() => void build()} disabled={!types.length}>
              {onBack ? "Rebuild my plan" : "Build my plan"}
            </Button>
          </View>
        }
      >
        {header("How do you like to move?", "Pick one or more. We'll mix them into your week.")}
        <Animated.View entering={FadeIn.duration(250)}>
          <MoveTiles types={types} onToggle={toggle} />
        </Animated.View>
      </Screen>
    );

  return (
    <Screen tabBar={!onBack} footer={<Button onPress={() => setStep("move")}>Looks right · Continue</Button>}>
      {header("We already know you", "From your onboarding. Change days or time if you like.")}
      <Animated.View entering={FadeIn.duration(250)} style={{ gap: 20 }}>
        <KnowCard state={state} />
        <Choice title="Days a week" icon={CalendarDays}>
          <Segmented
            label="Days a week"
            options={DAYS.map((d) => ({ value: d, label: String(d) }))}
            value={days as (typeof DAYS)[number]}
            onChange={setDays}
          />
        </Choice>
        <Choice title="Time per session" icon={Clock}>
          <Segmented
            label="Time per session"
            options={MINUTES.map((m) => ({ value: m, label: `${m} min` }))}
            value={minutes as (typeof MINUTES)[number]}
            onChange={setMinutes}
          />
        </Choice>
      </Animated.View>
    </Screen>
  );
}

/** Step 1's card: what onboarding told us, as chips. */
function KnowCard({ state }: { state: TrainingStateDto }) {
  const c = useColors();
  const styles = useStyles();
  const s = state.summary;
  const target = s.targetWeightKg
    ? `${GOAL_LABEL[s.goal]} · ${s.targetWeightKg} kg by ${monthYear(s.targetDate)}`
    : GOAL_LABEL[s.goal];
  const chips: { icon: LucideIcon; text: string }[] = [
    { icon: Target, text: target },
    { icon: TrendingUp, text: EXPERIENCE_LABEL[s.experience] },
    { icon: Dumbbell, text: EQUIPMENT_LABEL[s.equipment] },
    ...(s.injuries.length ? [{ icon: HeartPulse, text: `Go easy on: ${s.injuries.join(", ")}` }] : []),
  ];
  return (
    <View style={styles.card}>
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <View key={chip.text} style={styles.chip}>
            <Icon size={14} color={c.brandText} strokeWidth={2.2} />
            <Text variant="labelStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {chip.text}
            </Text>
          </View>
        );
      })}
      <Text variant="caption" color={c.ink3}>
        Goal, level and equipment come from your profile; change them there.
      </Text>
    </View>
  );
}

function Choice({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={16} color={c.ink2} strokeWidth={2.2} />
        <Text variant="heading3" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Step 2: picture tiles for each way to train. */
function MoveTiles({ types, onToggle }: { types: TrainingType[]; onToggle: (t: TrainingType) => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.grid} accessibilityRole="list">
      {TRAINING_CHOICES.map((o) => {
        const on = types.includes(o.value);
        const Icon = TYPE_ICON[o.value];
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${o.label}: ${o.line}`}
            onPress={() => onToggle(o.value)}
            style={[styles.tile, on && styles.tileOn]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.tileIcon, { backgroundColor: on ? c.brand : c.ground }]}>
                <Icon size={20} color={on ? c.white : c.ink} strokeWidth={2} />
              </View>
              <View style={[styles.tick, on && { backgroundColor: c.brand, borderColor: c.brand }]}>
                {on && <Check size={12} color={c.white} strokeWidth={3} />}
              </View>
            </View>
            <View style={{ gap: 2 }}>
              <Text variant="bodyStrong">{o.label}</Text>
              <Text variant="caption" color={c.ink2} numberOfLines={1}>
                {o.line}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * Step 3: the plan being built (2026-11-28, user: "like something really good is being built").
 * Seven day slots shimmer in a wave, a bar fills step by step and a checklist written from their
 * answers ticks. The last step stays active until the real build (`week`) arrives — never ticked on
 * a timer — then it ticks, the slots snap into the real days one by one, and `onComplete` reveals.
 */
function Building({
  state,
  types,
  days,
  minutes,
  week,
  onComplete,
}: {
  state: TrainingStateDto;
  types: TrainingType[];
  days: number;
  minutes: number;
  week: TrainingWeekDto | null;
  onComplete: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const s = state.summary;
  const lines = [
    s.targetWeightKg
      ? `Matching your goal: ${GOAL_LABEL[s.goal].toLowerCase()} by ${monthYear(s.targetDate)}`
      : `Matching your goal: ${GOAL_LABEL[s.goal].toLowerCase()}`,
    `Fitting ${days} days × ${minutes} min`,
    types.includes("gym") || types.includes("home")
      ? `Picking exercises for ${EQUIPMENT_SHORT[s.equipment]}, ${EXPERIENCE_LABEL[s.experience].toLowerCase()} level`
      : `Planning your ${types.map((t) => TRAINING_CHOICES.find((o) => o.value === t)?.label.toLowerCase()).join(" and ")}`,
    ...(s.injuries.length ? [`Keeping it easy on your ${s.injuries.join(", ")}`] : []),
    "Adding rest and recovery days",
  ];
  const last = lines.length - 1;
  const [done, setDone] = useState(0);

  // Tick every line but the last on a rhythm; the last only once the week is really built.
  useEffect(() => {
    if (done < last) {
      const t = setTimeout(() => setDone((n) => n + 1), STEP_MS);
      return () => clearTimeout(t);
    }
    if (done === last && week) {
      const t = setTimeout(() => setDone(lines.length), STEP_MS / 2);
      return () => clearTimeout(t);
    }
  }, [done, last, week, lines.length]);

  // All ticked: let the slots fill, then reveal. The latest callback is kept in a ref so a parent
  // re-render doesn't restart the timer.
  const filled = done >= lines.length && week != null;
  const complete = useRef(onComplete);
  useEffect(() => {
    complete.current = onComplete;
  });
  useEffect(() => {
    if (!filled) return;
    const t = setTimeout(() => complete.current(), (reduce ? 0 : 7 * SLOT_MS) + REVEAL_PAUSE_MS);
    return () => clearTimeout(t);
  }, [filled, reduce]);

  const progress = filled ? 1 : Math.min(0.94, (done + 0.5) / lines.length);
  const bar = useSharedValue(0);
  useEffect(() => {
    bar.set(withTiming(progress, { duration: reduce ? 0 : 450, easing: Easing.out(Easing.cubic) }));
  }, [progress, reduce, bar]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.get() * 100}%` }));

  const dayIcon = (type: string): ComponentType<IconProps> =>
    type === "rest" ? Clock : (TYPE_ICON[type as TrainingType] ?? (type === "hiit" ? Activity : Dumbbell));
  const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <View style={{ gap: 24, paddingTop: 16 }} accessibilityLiveRegion="polite">
      <View style={{ gap: 6 }}>
        <Text variant="title" accessibilityRole="header">
          {filled ? "Your plan is ready" : "Building your plan…"}
        </Text>
        <Text variant="bodySm" color={c.ink2}>
          Made from what you told us.
        </Text>
      </View>

      {/* The week being assembled: shimmering slots, then the real days snap in. */}
      <View style={styles.card}>
        <View style={styles.weekRow}>
          {LETTERS.map((letter, i) => {
            const d = filled ? week?.days[i] : undefined;
            const Icon = d ? dayIcon(d.type) : null;
            const rest = d?.type === "rest";
            return (
              <View key={i} style={styles.dayCol}>
                <Text variant="caption" color={c.ink3}>
                  {d ? d.weekday.slice(0, 1) : letter}
                </Text>
                {d && Icon ? (
                  <Animated.View
                    entering={
                      reduce
                        ? undefined
                        : ZoomIn.delay(i * SLOT_MS)
                            .springify()
                            .damping(14)
                    }
                    style={[styles.dayTile, { backgroundColor: rest ? c.ground : c.brandSoft }]}
                  >
                    <Icon size={16} color={rest ? c.ink3 : c.brandText} strokeWidth={2} />
                  </Animated.View>
                ) : (
                  <Shimmer index={i} />
                )}
              </View>
            );
          })}
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
          <Text variant="caption" color={c.ink2} tabular>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {lines.map((line, i) => {
          const ticked = i < done;
          const active = i === done && !filled;
          const shown = i <= done;
          if (!shown) return null;
          return (
            <Animated.View
              key={line}
              entering={reduce ? undefined : FadeInDown.duration(260)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 28 }}
            >
              <View style={[styles.stepDot, ticked && { backgroundColor: c.brand, borderColor: c.brand }]}>
                {ticked ? (
                  <Animated.View entering={reduce ? undefined : ZoomIn.duration(200)}>
                    <Check size={12} color={c.white} strokeWidth={3} />
                  </Animated.View>
                ) : active ? (
                  <ActivityIndicator size="small" color={c.brand} style={{ transform: [{ scale: 0.6 }] }} />
                ) : null}
              </View>
              <Text variant={active ? "labelStrong" : "labelMedium"} color={c.ink} style={{ flex: 1 }}>
                {line}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/** An empty day slot, softly pulsing in a wave across the week while the plan builds. */
function Shimmer({ index }: { index: number }) {
  const styles = useStyles();
  const c = useColors();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(
      withDelay(
        index * 110,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        ),
      ),
    );
    return () => cancelAnimation(t);
  }, [reduce, index, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + t.get() * 0.55,
    transform: [{ scale: 0.94 + t.get() * 0.06 }],
  }));
  return <Animated.View style={[styles.dayTile, { backgroundColor: c.ground }, style]} />;
}

/** Step 4: the week pops in day by day, with why this plan. */
function Ready({ week }: { week: TrainingWeekDto }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const sample = week.preview ? week.days.find((d) => d.date === week.sampleDate) : undefined;
  const dayIcon = (type: string): ComponentType<IconProps> =>
    type === "rest" ? Clock : (TYPE_ICON[type as TrainingType] ?? (type === "hiit" ? Activity : Dumbbell));
  return (
    <View style={{ gap: 20, paddingTop: 8 }}>
      <View style={{ gap: 6 }}>
        <Text variant="labelStrong" color={c.brandText}>
          {week.plan}
        </Text>
        <Text variant="title" accessibilityRole="header">
          Your week is ready
        </Text>
      </View>
      <View style={styles.weekRow}>
        {week.days.map((d, i) => {
          const Icon = dayIcon(d.type);
          const rest = d.type === "rest";
          return (
            <Animated.View
              key={d.date}
              entering={reduce ? undefined : FadeInDown.delay(120 + i * 90).duration(320)}
              style={styles.dayCol}
            >
              <Text variant="caption" color={c.ink3}>
                {d.weekday.slice(0, 1)}
              </Text>
              <View style={[styles.dayTile, { backgroundColor: rest ? c.ground : c.brandSoft }]}>
                <Icon size={16} color={rest ? c.ink3 : c.brandText} strokeWidth={2} />
              </View>
              <Text variant="caption" color={rest ? c.ink3 : c.ink2} numberOfLines={1}>
                {rest ? "Rest" : `${d.minutes}m`}
              </Text>
            </Animated.View>
          );
        })}
      </View>
      <Animated.View entering={reduce ? undefined : FadeIn.delay(900).duration(400)} style={styles.card}>
        <Text variant="labelStrong">Why this plan</Text>
        <Text variant="labelMedium" color={c.ink2} style={{ lineHeight: 19 }}>
          {week.coachNote}
        </Text>
      </Animated.View>
      {sample && (
        <Animated.View entering={reduce ? undefined : FadeIn.delay(1100).duration(400)}>
          <Text variant="labelMedium" color={c.brandText} center>
            {sample.weekday}&apos;s {sample.title.toLowerCase()} is free in full this week.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: c.brandSoft,
  },
  // An exact two-column grid: equal widths and heights, so rows line up whatever the text.
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  tile: {
    width: "48.5%",
    height: 124,
    justifyContent: "space-between",
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: c.surface,
    ...shadows.card,
  },
  tileOn: { borderColor: c.brand, backgroundColor: c.brandSoft },
  tileIcon: { width: 40, height: 40, borderRadius: radius.tile, alignItems: "center", justifyContent: "center" },
  tick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: c.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 6, width: 40 },
  dayTile: { width: 38, height: 38, borderRadius: radius.tile, alignItems: "center", justifyContent: "center" },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: c.track, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: c.brand },
}));
