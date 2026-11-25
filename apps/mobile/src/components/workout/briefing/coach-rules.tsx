import { Sparkles } from "lucide-react-native";
import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";
import type { TodayWorkout } from "@/lib/types";

/** Briefing (10a) dark card: the rules the coach set for today's session, each with its reason. */
export function CoachRules({ rules }: { rules: NonNullable<TodayWorkout["session"]>["rules"] }) {
  const c = useColors();
  return (
    <Card dark style={{ padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} color={c.brandGlow} />
        <Text weight={600} size={13} color="rgba(255,255,255,0.7)">
          What your coach set today
        </Text>
      </View>
      {rules.map((r) => (
        <View key={r.title}>
          <Text weight={600} color={c.white}>
            {r.title}
          </Text>
          <Text size={13} color="rgba(255,255,255,0.75)">
            {r.reason}
          </Text>
        </View>
      ))}
    </Card>
  );
}
