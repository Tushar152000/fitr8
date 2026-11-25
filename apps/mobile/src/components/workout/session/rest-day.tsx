import { router } from "expo-router";
import { View } from "react-native";
import { Button, Card, ListCard, Text } from "@/components/ui";
import { weekdayName } from "@/lib/dates";
import { useColors } from "@/lib/theme";
import { repsLabel } from "@/lib/training";
import type { TodayWorkout } from "@/lib/types";

/** Focus mode on a rest day (15b): today's cardio, a look at the next session, and the briefing. */
export function RestDay({ data }: { data: TodayWorkout }) {
  const c = useColors();
  return (
    <>
      <Card>
        <Text color={c.ink2}>{data.cardio}</Text>
      </Card>
      {data.nextDay && (
        <ListCard title={`Next: ${data.nextDay.name}, ${weekdayName(data.nextDay.date)}`}>
          {data.nextDay.exercises.map((e) => (
            <View
              key={e.slug}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text weight={600} style={{ flex: 1 }}>
                {e.name}
              </Text>
              <Text size={13} color={c.ink3} tabular>
                {e.sets} × {repsLabel(e)}
                {e.targetKg != null ? ` · ${e.targetKg} kg` : ""}
              </Text>
            </View>
          ))}
        </ListCard>
      )}
      <Button variant="secondary" onPress={() => router.push("/briefing")}>
        Coach briefing
      </Button>
    </>
  );
}
