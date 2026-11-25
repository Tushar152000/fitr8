import type { FoodDto } from "@fitr8/contracts";
import { Image } from "expo-image";
import { Package } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { formatQty } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { VerifiedBadge } from "../verified-badge";

/** Design 7d head: where the values come from, the pack shot, brand, name and serving size. */
export function ProductSummary({ food }: { food: FoodDto }) {
  const c = useColors();
  const styles = useStyles();
  const measure = food.isLiquid ? "ml" : "g";
  const fromOff = food.source === "OPEN_FOOD_FACTS";
  // Stored names carry the brand / barcode to stay unique; the brand is shown separately.
  const displayName = food.name.replace(/ · \d+$/, "").replace(food.brand ? ` (${food.brand})` : /$^/, "");
  return (
    <View style={{ gap: 16 }}>
      <VerifiedBadge>{fromOff || food.verified ? "Exact label values" : "Your label scan"}</VerifiedBadge>
      <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
        <View style={styles.pack}>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : (
            <Package size={32} color={c.ink3} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {food.brand && (
            <Text weight={600} size={13} color={c.ink3}>
              {food.brand}
            </Text>
          )}
          <Text variant="h1" size={24}>
            {displayName}
          </Text>
          {food.servingSizeG && (
            <Text size={13} color={c.ink2} tabular style={{ marginTop: 4 }}>
              1 serving = {formatQty(food.servingSizeG)} {measure}
              {food.servingLabel && food.servingLabel !== `${food.servingSizeG} ${measure}`
                ? ` (${food.servingLabel})`
                : ""}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pack: {
    width: 80,
    height: 80,
    borderRadius: radius.card,
    // Pack shots are photographed on white; a white box keeps them clean in dark mode too.
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
}));
