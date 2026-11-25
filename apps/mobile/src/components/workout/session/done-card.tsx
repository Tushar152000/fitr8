import { router } from "expo-router";
import { Utensils } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Shown once every exercise is ticked (15b): eat protein next, with a link to log the meal. */
export function SessionDoneCard() {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Utensils size={20} color={c.protein} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text weight={700}>Session done. Protein next.</Text>
        <Text size={13} color={c.ink2}>
          Aim for 25–40 g of protein at your next meal to help recovery.
        </Text>
        <PressableScale accessibilityRole="link" onPress={() => router.push("/log/type")}>
          <Text weight={600} size={13} color={c.brandText}>
            Log your next meal
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.proteinSoft,
    padding: 16,
  },
}));
