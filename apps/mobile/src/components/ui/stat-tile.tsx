import { View } from "react-native";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { Text } from "./text";

/** A small number tile in a row of tiles: label, big value, one line under it (Progress, plan). */
export function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text variant="labelStrong" color={c.ink2}>
        {label}
      </Text>
      <Text variant="heading1" tabular>
        {value}
      </Text>
      <Text variant="labelRegular" color={c.ink2}>
        {sub}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  tile: { flex: 1, borderRadius: radius.card, backgroundColor: c.surface, padding: 16, gap: 2, ...shadows.card },
}));
