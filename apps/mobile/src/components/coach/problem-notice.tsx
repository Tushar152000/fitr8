import { View } from "react-native";
import { Card, FieldError, Text } from "@/components/ui";
import type { CoachProblem } from "@/lib/use-coach-chat";
import { useColors } from "@/lib/theme";

/** Under the thread when a reply failed: a card for today's chat limit, otherwise the error line. */
export function ProblemNotice({ problem }: { problem: CoachProblem }) {
  const c = useColors();
  return (
    <View accessibilityLiveRegion="polite">
      {problem.kind === "limit" ? (
        <Card>
          <Text weight={600}>That&apos;s today&apos;s coach chats used up</Text>
          <Text size={13} color={c.ink2}>
            {problem.message} Logging meals, water and workouts still works as usual.
          </Text>
        </Card>
      ) : (
        <FieldError>{problem.message}</FieldError>
      )}
    </View>
  );
}
