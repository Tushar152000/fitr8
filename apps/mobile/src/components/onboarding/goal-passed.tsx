import { CalendarClock } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text } from "@/components/ui";
import { gutter, makeStyles, useColors } from "@/lib/theme";

/** Welcome back, after saving: the goal date went by while away, so offer a new goal or keeping it. */
export function GoalPassed({ onNewGoal, onKeepGoal }: { onNewGoal: () => void; onKeepGoal: () => void }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: Math.max(16, insets.bottom) }]}>
      <View style={{ flex: 1, paddingHorizontal: gutter, gap: 16 }}>
        <View style={styles.badge}>
          <CalendarClock size={26} color={c.brandText} strokeWidth={2} />
        </View>
        <Text variant="title" accessibilityRole="header">
          Your goal date has passed
        </Text>
        <Text variant="bodySm" color={c.ink2}>
          Your targets now use today&apos;s numbers. The date you aimed for went by while you were away, so pick a new
          one to get a realistic pace again.
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, gap: 10 }}>
        <Button onPress={onNewGoal}>Set a new goal</Button>
        <Button variant="secondary" onPress={onKeepGoal}>
          Keep my goal for now
        </Button>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.ground },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: c.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
}));
