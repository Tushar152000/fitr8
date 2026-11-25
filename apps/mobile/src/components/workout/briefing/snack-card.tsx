import { Coffee } from "lucide-react-native";
import { View } from "react-native";
import { Button, Card, FieldError, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, useColors } from "@/lib/theme";
import type { TodayWorkout } from "@/lib/types";

export type SnackState = "idle" | "saving" | "done";

/** Briefing (10a) pre-workout snack when fuel is low, with "Log it" (as a snack). */
export function SnackCard({
  snack,
  state,
  error,
  onLog,
}: {
  snack: NonNullable<TodayWorkout["snack"]>;
  state: SnackState;
  error: string | null;
  onLog: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Card accessibilityLabel="Pre-workout snack">
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={styles.icon}>
          <Coffee size={20} color={c.ink2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight={600} size={12} color={c.ink3}>
            Before you train{snack.usual ? " · one of your usuals" : ""}
          </Text>
          <Text weight={600}>{snack.name}</Text>
          <Text size={13} color={c.ink3} tabular>
            {snack.proteinG} g protein · {snack.carbsG} g carbs · {formatInt(snack.kcal)} kcal
          </Text>
        </View>
      </View>
      <Button variant="secondary" onPress={onLog} loading={state === "saving"} disabled={state === "done"}>
        {state === "done" ? "Logged as a snack" : "Log it"}
      </Button>
      {error && <FieldError>{error}</FieldError>}
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
}));
