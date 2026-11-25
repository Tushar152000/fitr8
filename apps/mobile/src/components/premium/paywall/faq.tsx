import { View } from "react-native";
import { Section, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** Design 14c "Questions": the short paywall FAQ. */
export function Faq({ storeSettings }: { storeSettings: string }) {
  const c = useColors();
  return (
    <Section title="Questions" gap={12}>
      {(
        [
          [
            "What happens after 10 photos in a day?",
            "You can still scan barcodes and type meals. Photo scans reset at midnight.",
          ],
          ["Can I switch between monthly and yearly?", `Yes, any time from ${storeSettings}.`],
          ["Is my Free data safe if I upgrade?", "Yes. Your meals, targets and streak carry over as they are."],
        ] as const
      ).map(([q, a]) => (
        <View key={q} style={{ gap: 4 }}>
          <Text weight={700}>{q}</Text>
          <Text size={14} color={c.ink2}>
            {a}
          </Text>
        </View>
      ))}
    </Section>
  );
}
