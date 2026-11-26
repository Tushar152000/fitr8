import { ChevronLeft } from "lucide-react-native";
import { View } from "react-native";
import { goBack, IconButton } from "@/components/ui";
import { useColors } from "@/lib/theme";

/**
 * The product screens' top: PageHeader's round 44 px back button on its own, because the product's
 * name (or the not-found message) is the page title and runs to two lines below it.
 */
export function BackRow() {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row" }}>
      <IconButton label="Back" onPress={goBack} icon={<ChevronLeft size={20} color={c.ink} strokeWidth={2} />} />
    </View>
  );
}
