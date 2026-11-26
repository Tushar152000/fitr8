import { router } from "expo-router";
import { Utensils } from "lucide-react-native";
import { View } from "react-native";
import { IconTile, PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Shown once every exercise is ticked (15b): eat protein next, with a link to log the meal. */
export function SessionDoneCard() {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <IconTile icon={Utensils} accent />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="heading3">Session done. Protein next.</Text>
        <Text variant="bodySm" color={c.ink2}>
          Aim for 25–40 g of protein at your next meal to help recovery.
        </Text>
        <PressableScale accessibilityRole="link" onPress={() => router.push("/log/type")} hitSlop={8}>
          <Text variant="bodyStrong" color={c.brandText} style={{ marginTop: 4 }}>
            Log your next meal
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    padding: 16,
    ...shadows.card,
  },
}));
