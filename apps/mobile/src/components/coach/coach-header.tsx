import { History } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { IconButton, PageHeader } from "@/components/ui";
import { gutter, makeStyles, useColors } from "@/lib/theme";

/** Coach header (Figma "Your coach"): back, eyebrow + title with the Premium tag, and the past-chats button. */
export function CoachHeader({ isPremium, onMenu }: { isPremium: boolean; onMenu: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <PageHeader
        eyebrow="Food, training, running & recovery"
        title="Your coach"
        badge={isPremium ? <PremiumBadge /> : undefined}
        trailing={
          <IconButton
            label="Past chats and memory"
            onPress={onMenu}
            icon={<History size={20} color={c.ink} strokeWidth={2} absoluteStrokeWidth />}
          />
        }
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { paddingHorizontal: gutter, paddingBottom: 16, backgroundColor: c.ground },
}));
