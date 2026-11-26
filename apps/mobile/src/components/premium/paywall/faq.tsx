import { View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/lib/theme";
import { PaywallGroup } from "./group";
import { useListStyles } from "./list-styles";

/** Design 14c "Questions": the short paywall FAQ, every answer shown, on one white card. */
export function Faq({ storeSettings }: { storeSettings: string }) {
  const c = useColors();
  const list = useListStyles();
  return (
    <PaywallGroup label="Questions">
      <View style={list.list}>
        {(
          [
            [
              "What happens after 10 photos in a day?",
              "You can still scan barcodes and type meals. Photo scans reset at midnight.",
            ],
            ["Can I switch between monthly and yearly?", `Yes, any time from ${storeSettings}.`],
            ["Is my Free data safe if I upgrade?", "Yes. Your meals, targets and streak carry over as they are."],
          ] as const
        ).map(([q, a], i) => (
          <View key={q} style={[{ gap: 4, paddingVertical: 14 }, i > 0 && list.divider]}>
            <Text variant="bodyStrong">{q}</Text>
            <Text variant="bodySm" color={c.ink2}>
              {a}
            </Text>
          </View>
        ))}
      </View>
    </PaywallGroup>
  );
}
