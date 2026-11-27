import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Camera, ChevronRight, Crown, ScanBarcode, Search, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { MovingGradient, PressableScale, SectionLabel, Text } from "@/components/ui";
import { formatInt, type MealType } from "@/lib/format";
import { SLOT } from "@/lib/meal-slots";
import { usePremium } from "@/lib/premium";
import { usageQuery } from "@/lib/queries";
import { fade, makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Meals "Quick log" (redesign 2026-11-28, user request: snapping is the main feature). "Snap your
 * lunch" (the meal for the time of day; "Snap your meal" on a past day) is the hero, with
 * "~520 kcal fits your lunch" from what's left; it opens the camera on that meal. a wide black → olive gradient button (glint) with a pulsing camera, "Calories
 * and macros in seconds", and for free users a crown "Premium" tag or "n scans left today". Scan
 * barcode and Search food sit under it as two compact buttons (a small crown on barcode when it's
 * locked). Every button opens its logger (the camera handles the Premium sheet when locked).
 * `date` = a past day in the logging window.
 */
export function QuickLog({
  date,
  mealType,
  suggestedKcal,
}: {
  date: string | null;
  /** The meal for the time of day (today), or null on a past day. */
  mealType: MealType | null;
  /** What fits that meal from what's left today, or null. */
  suggestedKcal: number | null;
}) {
  const c = useColors();
  const styles = useStyles();
  const params = { ...(date ? { date } : {}), ...(mealType ? { meal: mealType } : {}) };
  const meal = mealType ? (mealType === "SNACK" ? "snack" : SLOT[mealType].title.toLowerCase()) : null;
  const title = meal ? `Snap your ${meal}` : "Snap your meal";
  const line =
    meal && suggestedKcal && suggestedKcal > 0
      ? `~${formatInt(Math.round(suggestedKcal / 10) * 10)} kcal fits your ${meal}`
      : "Calories and macros in seconds";
  const premium = usePremium();
  const usage = useQuery(usageQuery);
  const photoLocked = premium.locked("photo_scan");
  const barcodeLocked = premium.locked("barcode");
  // Free plan with some photo scans a day: say how many are left.
  const scansLeft = !premium.isPremium && !photoLocked && usage.data ? usage.data.left : null;

  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>Log a meal</SectionLabel>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${title}${photoLocked ? ". Premium" : scansLeft != null ? `. ${scansLeft} scans left today` : ""}`}
        onPress={() => router.push({ pathname: "/log", params })}
        style={styles.hero}
      >
        {/* Blends with the page (2026-11-28): the card colour with a faint olive tint from the top. */}
        <LinearGradient
          colors={[fade(c.brand, 0.1), fade(c.brand, 0)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <PulsingCamera />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="heading3">{title}</Text>
            {photoLocked ? (
              <View style={styles.tag}>
                <Crown size={11} color={c.brandText} strokeWidth={2.4} />
                <Text variant="captionStrong" color={c.brandText}>
                  Premium
                </Text>
              </View>
            ) : scansLeft != null ? (
              <View style={styles.tag}>
                <Text variant="captionStrong" color={c.brandText} tabular>
                  {scansLeft} left today
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="labelMedium" color={c.ink2} tabular>
            {line}
          </Text>
        </View>
        <View style={styles.go}>
          <ChevronRight size={18} color={c.ink} strokeWidth={2.4} />
        </View>
      </PressableScale>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Secondary
          icon={ScanBarcode}
          label="Scan barcode"
          locked={barcodeLocked}
          onPress={() => router.push({ pathname: "/log", params })}
        />
        <Secondary icon={Search} label="Search food" onPress={() => router.push({ pathname: "/log/type", params })} />
      </View>
    </View>
  );
}

/** The camera in a soft round tile with a ring that keeps pulsing out (Reduce Motion: still). */
function PulsingCamera() {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  const ring = useAnimatedStyle(() => ({ opacity: (1 - t.get()) * 0.6, transform: [{ scale: 1 + t.get() * 0.6 }] }));
  return (
    <View style={styles.camWrap}>
      {!reduce && <Animated.View style={[styles.camRing, ring]} />}
      <View style={styles.cam}>
        <MovingGradient width={48} height={48} />
        <Camera size={22} color="#ffffff" strokeWidth={2} />
      </View>
    </View>
  );
}

function Secondary({
  icon: Icon,
  label,
  locked,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  locked?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}. Premium` : label}
      onPress={onPress}
      style={styles.secondary}
    >
      <Icon size={18} color={c.ink} strokeWidth={2} />
      <Text variant="labelStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {locked && <Crown size={12} color={c.brandText} strokeWidth={2.2} />}
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 84,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: c.surface,
    ...shadows.card,
  },
  go: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  camWrap: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  cam: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  camRing: { position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: c.brand },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: c.brandSoft,
  },
  secondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
}));
