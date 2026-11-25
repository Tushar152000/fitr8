import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { ProfilePage } from "@/components/profile/profile-page";
import { FAQS } from "@/components/support/faqs";
import { PressableScale, PillButton, Text } from "@/components/ui";
import { reveal } from "@/lib/motion";
import { emailSupport } from "@/lib/support";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Help & support → FAQs: one white card of questions; tap one to open its answer. */
export default function FaqScreen() {
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ProfilePage title="FAQs" eyebrow="Help & support">
      <View style={styles.group}>
        {FAQS.map((f, i) => {
          const expanded = open === i;
          return (
            <View key={f.q} style={i < FAQS.length - 1 && styles.divider}>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpen(expanded ? null : i)}
                style={styles.question}
              >
                <Text variant="bodyStrong" style={{ flex: 1, lineHeight: 20 }}>
                  {f.q}
                </Text>
                <ChevronDown
                  size={18}
                  color={c.ink2}
                  strokeWidth={2}
                  style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                />
              </PressableScale>
              {expanded && (
                <Animated.View entering={reveal} style={{ paddingBottom: 14 }}>
                  <Text variant="bodySm" color={c.ink2}>
                    {f.a}
                  </Text>
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
      <View style={{ gap: 12, alignItems: "center" }}>
        <Text variant="bodySm" color={c.ink2} center>
          Didn&apos;t find your answer?
        </Text>
        <PillButton variant="secondary" label="Email support" onPress={() => void emailSupport()} />
      </View>
    </ProfilePage>
  );
}

const useStyles = makeStyles((c) => ({
  group: { backgroundColor: c.surface, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4 },
  question: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: c.line },
}));
