import { ChevronLeft } from "lucide-react-native";
import { View } from "react-native";
import { IconButton, ProgressSteps } from "@/components/ui";
import { useColors } from "@/lib/theme";

/**
 * The onboarding top bar: the step bar on a 44 px row, with the v2 round back button (PageHeader's
 * IconButton) before it when there is a step to go back to.
 */
export function StepsBar({ current, total, onBack }: { current: number; total: number; onBack?: () => void }) {
  const c = useColors();
  return (
    <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 }}>
      {onBack && (
        <IconButton label="Back" onPress={onBack} icon={<ChevronLeft size={20} color={c.ink} strokeWidth={2} />} />
      )}
      <View style={{ flex: 1 }}>
        <ProgressSteps current={current} total={total} />
      </View>
    </View>
  );
}
