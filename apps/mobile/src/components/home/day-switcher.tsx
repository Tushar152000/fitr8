import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { dayLabel } from "@/lib/meal-param";
import { makeStyles, useColors } from "@/lib/theme";

/**
 * Figma "Day Switcher": a white pill, ‹ day › with a hint under the day ("Tap for the calendar"; the swipe moves between tabs,
 * or "Back to today" on a past day). Tapping the middle opens the month calendar (`onCalendar`).
 * Fixed height, so nothing below moves when the day changes. A disabled arrow is drawn in
 * text/secondary, as in the design.
 */
export function DaySwitcher({
  day,
  canOlder,
  canNewer,
  onOlder,
  onNewer,
  onToday,
  onCalendar,
}: {
  day: string;
  canOlder: boolean;
  canNewer: boolean;
  onOlder: () => void;
  onNewer: () => void;
  onToday: () => void;
  onCalendar?: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.switcher} accessibilityLabel="Choose a day">
      <Arrow label="Previous day" enabled={canOlder} onPress={onOlder}>
        <ChevronLeft size={24} color={canOlder ? c.ink : c.ink2} strokeWidth={2} />
      </Arrow>
      {/* Middle: the day (→ calendar) and its hint. "Back to today" is a sibling button, not nested. */}
      <View style={styles.mid}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${dayLabel(day)}. Open the calendar`}
          disabled={!onCalendar}
          onPress={onCalendar}
          hitSlop={{ top: 12, bottom: canNewer ? 2 : 12, left: 24, right: 24 }}
          style={styles.midPress}
        >
          <Text variant="bodyStrong" style={styles.tight} accessibilityLiveRegion="polite" numberOfLines={1}>
            {dayLabel(day)}
          </Text>
          {!canNewer && (
            <Text variant="labelRegular" color={c.ink2} style={styles.tight}>
              Tap for the calendar
            </Text>
          )}
        </PressableScale>
        {canNewer && (
          <Pressable accessibilityRole="button" onPress={onToday} hitSlop={{ top: 2, bottom: 12, left: 24, right: 24 }}>
            <Text variant="labelStrong" color={c.brandText} style={styles.tight}>
              Back to today
            </Text>
          </Pressable>
        )}
      </View>
      <Arrow label="Next day" enabled={canNewer} onPress={onNewer}>
        <ChevronRight size={24} color={canNewer ? c.ink : c.ink2} strokeWidth={2} />
      </Arrow>
    </View>
  );
}

function Arrow({
  label,
  enabled,
  onPress,
  children,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
      style={({ pressed }) => [styles.arrow, pressed && { backgroundColor: c.sunken }]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 58,
    borderRadius: 100,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
  },
  arrow: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mid: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  midPress: { alignItems: "center", gap: 2 },
  // Figma letter-spacing on this component: -2 %.
  tight: { letterSpacing: -0.26 },
}));
