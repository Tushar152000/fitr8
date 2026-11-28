import { Database, RefreshCw, ShieldCheck } from "lucide-react-native";
import { View } from "react-native";
import { IconTile, Text } from "@/components/ui";
import { useListStyles } from "./list-styles";

/** Design 14c billing reassurance: who charges, how to cancel, and that logs stay on Free. */
export function BillingNotes({
  testMode,
  razorpay,
  trial,
  storeName,
  storeSettings,
}: {
  testMode: boolean;
  razorpay: boolean;
  /** The free trial applies: Razorpay checks the payment method first. */
  trial: boolean;
  storeName: string;
  storeSettings: string;
}) {
  const list = useListStyles();
  return (
    <View style={list.list}>
      {(
        [
          [
            ShieldCheck,
            testMode
              ? "Nothing is charged while FITR8 is in testing"
              : razorpay
                ? "Paid securely through Razorpay: UPI AutoPay, cards or netbanking"
                : `Paid securely through ${storeName}`,
          ],
          [RefreshCw, razorpay ? "Cancel anytime in Profile" : `Cancel anytime in ${storeSettings}`],
          ...(razorpay && trial
            ? ([[ShieldCheck, "Free for 7 days. A small refundable check verifies your payment method"]] as const)
            : []),
          [Database, "Your logs stay if you go back to Free"],
        ] as const
      ).map(([Icon, text], i) => (
        <View key={text} style={[list.row, i > 0 && list.divider]}>
          <IconTile icon={Icon} />
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            {text}
          </Text>
        </View>
      ))}
    </View>
  );
}
