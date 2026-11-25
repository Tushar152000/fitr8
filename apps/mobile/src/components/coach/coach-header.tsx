import { router } from "expo-router";
import { ChevronLeft, History } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { Text } from "@/components/ui";
import { gutter, makeStyles, useColors } from "@/lib/theme";

/** Coach header: round back button, the title (with the Premium badge), and the chats-and-memory button. */
export function CoachHeader({ isPremium, onMenu }: { isPremium: boolean; onMenu: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={({ pressed }) => [styles.round, pressed && { backgroundColor: c.sunken }]}
      >
        <ChevronLeft size={22} color={c.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text weight={500} size={12} color={c.ink3}>
          Food, training, running &amp; recovery
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="h2" size={22}>
            Your coach
          </Text>
          {isPremium && <PremiumBadge />}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chats and memory"
        onPress={onMenu}
        style={({ pressed }) => [styles.round, pressed && { backgroundColor: c.sunken }]}
      >
        <History size={20} color={c.ink} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: gutter,
    paddingBottom: 8,
    backgroundColor: c.ground,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
}));
