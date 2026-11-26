import type { TrainingLogDto } from "@fitr8/contracts";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";
import { DAY_LABEL, kcalText } from "@/lib/training";
import { useRemoveTrainingLog } from "@/lib/use-remove-training-log";

/** One logged session on a training day (16d), with "Remove". */
export function LoggedRow({ log }: { log: TrainingLogDto }) {
  const c = useColors();
  const remove = useRemoveTrainingLog();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text variant="bodyMedium" style={{ flex: 1 }} tabular>
        {DAY_LABEL[log.type]} · {log.minutes} min{log.distanceKm ? ` · ${log.distanceKm} km` : ""} ·{" "}
        {kcalText(log.kcal)} kcal
      </Text>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Remove this session"
        disabled={remove.isPending}
        onPress={() => remove.mutate(log.id)}
        style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}
      >
        <Text variant="labelStrong" color={c.danger}>
          Remove
        </Text>
      </PressableScale>
    </View>
  );
}
