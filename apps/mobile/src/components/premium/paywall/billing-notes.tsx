import { Database, RefreshCw, ShieldCheck } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/lib/theme";
import { useListStyles } from "./list-styles";

/** Design 14c billing reassurance: who charges, how to cancel, and that logs stay on Free. */
export function BillingNotes({
  testMode,
  storeName,
  storeSettings,
}: {
  testMode: boolean;
  storeName: string;
  storeSettings: string;
}) {
  const c = useColors();
  const list = useListStyles();
  return (
    <View style={list.list}>
      {(
        [
          [
            ShieldCheck,
            testMode ? "Nothing is charged while FITR8 is in testing" : `Paid securely through ${storeName}`,
          ],
          [RefreshCw, `Cancel anytime in ${storeSettings}`],
          [Database, "Your logs stay if you go back to Free"],
        ] as const
      ).map(([Icon, text], i) => (
        <View key={text} style={[list.row, i > 0 && list.divider]}>
          <Icon size={18} color={c.protein} />
          <Text size={14} style={{ flex: 1 }}>
            {text}
          </Text>
        </View>
      ))}
    </View>
  );
}
