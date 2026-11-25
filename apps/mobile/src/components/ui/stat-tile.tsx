import { View } from "react-native";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { Text } from "./text";

/** A small number tile in a row of tiles: label, big value, one line under it (Progress, plan). */
export function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text weight={600} size={12} color={c.ink3}>
        {label}
      </Text>
      <Text variant="h2" size={22} tabular>
        {value}
      </Text>
      <Text size={12} color={c.ink3}>
        {sub}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tile: { flex: 1, borderRadius: radius.card, backgroundColor: c.surface, padding: 12 },
}));
