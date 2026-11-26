import { router } from "expo-router";
import { Camera, Check, CircleAlert, RotateCw, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Button, FieldError, PressableScale, Text } from "@/components/ui";
import type { MealType } from "@/lib/format";
import { NATIVE_DRIVER, useReduceMotion } from "@/lib/motion";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { TipsCard } from "./tips-card";

const STEP_MS = 2500;

/** Design 8: 3-step checklist + skeleton rows while the AI works. */
export function Analysing({ slow, mealType, hasPhoto }: { slow: boolean; mealType: MealType; hasPhoto: boolean }) {
  const c = useColors();
  const styles = useStyles();
  // Steps 2 and 3 are paced by time: the API only reports "analysing", not sub-steps.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 500), 500);
    return () => clearInterval(t);
  }, []);
  const steps = [hasPhoto ? "Photo uploaded" : "Meal received", "Finding the foods", "Estimating portions"];
  const active = elapsed < STEP_MS ? 1 : 2;
  const pulse = usePulse();

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <Text variant="heading1" accessibilityRole="header">
        Reading your plate…
      </Text>
      <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
        {steps.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <View
              key={label}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              accessibilityLabel={`${label}${done ? " — done" : current ? " — in progress" : ""}`}
            >
              <View
                style={[
                  styles.step,
                  done
                    ? { backgroundColor: c.protein }
                    : { borderWidth: 2, borderColor: current ? c.brandText : c.lineStrong },
                ]}
              >
                {done ? (
                  <Check size={14} color={c.white} strokeWidth={3} />
                ) : current ? (
                  <Animated.View style={[styles.dot, { opacity: pulse }]} />
                ) : null}
              </View>
              <Text variant={current ? "bodyStrong" : "bodySm"} color={done ? c.ink2 : current ? c.ink : c.ink3}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ gap: 10 }} aria-hidden>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={[styles.skeleton, { opacity: pulse }]}>
            <View style={[styles.bar, { width: "40%", height: 16 }]} />
            <View style={[styles.bar, { width: "25%", height: 12 }]} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={[styles.bar, { width: 128, height: 44, borderRadius: radius.input }]} />
              <View style={[styles.bar, { width: 64, height: 16, alignSelf: "center" }]} />
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={{ marginTop: "auto", flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }}>
        <Text variant="labelRegular" color={c.ink2}>
          {slow ? "This is taking longer than usual. " : "Taking too long? "}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace({ pathname: "/log/type", params: { meal: mealType } })}
        >
          <Text variant="labelStrong" color={c.brandText}>
            Type it instead
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function usePulse() {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: 600, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  return v;
}

/** Design 8 → 9 hand-off: results are in; one tap to review them. */
export function Found({ count, onReview }: { count: number; onReview: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const noun = count === 1 ? "item" : "items";
  return (
    <View style={{ flex: 1, gap: 8 }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.step, { width: 40, height: 40, borderRadius: 20, backgroundColor: c.protein }]}>
          <Check size={20} color={c.white} strokeWidth={3} />
        </View>
        <Text variant="heading1" accessibilityRole="header">
          Found {count} {noun}
        </Text>
      </View>
      <Text variant="bodySm" color={c.ink2}>
        Check the portions before saving — you can change anything.
      </Text>
      <View style={{ marginTop: "auto", paddingTop: 32 }}>
        <Button onPress={onReview}>{`Review ${count} ${noun}`}</Button>
      </View>
    </View>
  );
}

const TIPS = [
  "Shoot from above, whole plate in frame",
  "Use daylight or a bright room, no flash glare",
  "One plate or bowl per photo",
];

/** Design 9b: two variants — not food (no scan used) and our error (photo kept, retry). */
export function Failed({
  mealType,
  errorText,
  onRetry,
  retrying,
  error,
  onDelete,
}: {
  mealType: MealType;
  errorText: string | null;
  onRetry: () => void;
  retrying: boolean;
  error: string | null;
  onDelete: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const notFood = errorText?.includes("doesn't look like food");
  return (
    <View style={{ flex: 1, gap: 12 }}>
      {notFood ? (
        <>
          <Text variant="heading1" accessibilityRole="header">
            We couldn&apos;t spot any food
          </Text>
          <Text variant="bodySm" color={c.ink2}>
            This doesn&apos;t count toward your daily scans.
          </Text>
          <TipsCard title="For a better read" tips={TIPS} icon={Check} />
        </>
      ) : (
        <>
          <Text variant="heading1" accessibilityRole="header">
            We couldn&apos;t read this one
          </Text>
          <View style={[styles.card, { flexDirection: "row", gap: 12 }]}>
            <CircleAlert size={18} color={c.ink2} strokeWidth={2} style={{ marginTop: 1 }} />
            <Text variant="bodySm" color={c.ink2} style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={c.ink}>
                Your photo is saved.
              </Text>{" "}
              Something went wrong on our side — try again, or type it.
            </Text>
          </View>
        </>
      )}
      {error && <FieldError>{error}</FieldError>}
      <View style={{ marginTop: "auto", paddingTop: 32, gap: 12 }}>
        {notFood ? (
          <Button icon={Camera} onPress={() => router.replace({ pathname: "/log", params: { meal: mealType } })}>
            Retake photo
          </Button>
        ) : (
          <Button icon={RotateCw} onPress={onRetry} loading={retrying}>
            Try again
          </Button>
        )}
        <Button
          variant="secondary"
          onPress={() => router.replace({ pathname: "/log/type", params: { meal: mealType } })}
        >
          Type it instead
        </Button>
        <PressableScale
          accessibilityRole="button"
          onPress={onDelete}
          style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Trash2 size={16} color={c.ink2} strokeWidth={2} />
          <Text variant="labelStrong" color={c.ink2}>
            Delete this meal
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { borderRadius: radius.card, backgroundColor: c.surface, padding: 16, ...shadows.card },
  step: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brandText },
  skeleton: { gap: 12, borderRadius: radius.card, backgroundColor: c.surface, padding: 16, ...shadows.card },
  bar: { borderRadius: 999, backgroundColor: c.sunken },
}));
