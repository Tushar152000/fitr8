import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui";
import { dayLabel } from "@/lib/meal-param";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * ‹ Today › — step back up to a week to see a day and add a meal you forgot to log (or swipe the
 * cards below). Older days are in Past logs; the API won't take meals further back. Fixed height:
 * the second line is always there (a swipe hint today, "Back to today" on a past day), so nothing
 * below moves when the day changes.
 */
export function DaySwitcher({
  day,
  canOlder,
  canNewer,
  onOlder,
  onNewer,
  onToday,
}: {
  day: string;
  canOlder: boolean;
  canNewer: boolean;
  onOlder: () => void;
  onNewer: () => void;
  onToday: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.switcher} accessibilityLabel="Choose a day">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        accessibilityState={{ disabled: !canOlder }}
        disabled={!canOlder}
        onPress={onOlder}
        hitSlop={8}
        style={({ pressed }) => [
          styles.switchBtn,
          pressed && { backgroundColor: c.sunken },
          !canOlder && { opacity: 0.3 },
        ]}
      >
        <ChevronLeft size={20} color={c.ink} />
      </Pressable>
      <View style={styles.switchMid}>
        <Text weight={600} accessibilityLiveRegion="polite" numberOfLines={1}>
          {dayLabel(day)}
        </Text>
        {canNewer ? (
          <Pressable accessibilityRole="button" onPress={onToday} hitSlop={10}>
            <Text weight={600} size={12} color={c.brandText} style={styles.switchSub}>
              Back to today
            </Text>
          </Pressable>
        ) : (
          <Text size={12} color={c.ink3} style={styles.switchSub}>
            Swipe for earlier days
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: !canNewer }}
        disabled={!canNewer}
        onPress={onNewer}
        hitSlop={8}
        style={({ pressed }) => [
          styles.switchBtn,
          pressed && { backgroundColor: c.sunken },
          !canNewer && { opacity: 0.3 },
        ]}
      >
        <ChevronRight size={20} color={c.ink} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 60,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 6,
  },
  switchBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  switchMid: { flex: 1, alignItems: "center", justifyContent: "center", height: 44 },
  switchSub: { lineHeight: 16, height: 16 },
}));
