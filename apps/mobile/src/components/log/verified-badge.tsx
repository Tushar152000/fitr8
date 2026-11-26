import { BadgeCheck } from "lucide-react-native";
import { View } from "react-native";
import { StatusPill } from "@/components/ui";

/** The v2 accent tag with a check: "Exact label values", "Numbers add up". */
export function VerifiedBadge({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: "row" }}>
      <StatusPill label={children} icon={BadgeCheck} />
    </View>
  );
}
