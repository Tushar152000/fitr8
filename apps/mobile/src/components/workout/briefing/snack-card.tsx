import { Coffee } from "lucide-react-native";
import { View } from "react-native";
import { FieldError, IconTile, PillButton, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
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
    <View accessibilityLabel="Pre-workout snack" style={styles.card}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <IconTile icon={Coffee} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="labelMedium" color={c.ink2}>
            Before you train{snack.usual ? " · one of your usuals" : ""}
          </Text>
          <Text variant="bodyStrong">{snack.name}</Text>
          <Text variant="labelRegular" color={c.ink2} tabular>
            {snack.proteinG} g protein · {snack.carbsG} g carbs · {formatInt(snack.kcal)} kcal
          </Text>
        </View>
      </View>
      <PillButton
        variant="soft"
        label={state === "done" ? "Logged as a snack" : "Log it"}
        onPress={onLog}
        loading={state === "saving"}
        disabled={state === "done"}
      />
      {error && <FieldError>{error}</FieldError>}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 16, padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
}));
