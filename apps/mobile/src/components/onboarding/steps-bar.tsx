import { View } from "react-native";
import { ProgressSteps } from "@/components/ui";

/** The onboarding step dots on their own 44 px row (no back button beside them). */
export function StepsBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ minHeight: 44, justifyContent: "center" }}>
      <ProgressSteps current={current} total={total} />
    </View>
  );
}
