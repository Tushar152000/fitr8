import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Figma "Stat Tile" (Progress): Label/Medium label, Heading/H2 value, Caption/Strong caption in the
 * accent colour. Three share a row, 12 apart.
 */
export function ProgressStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}, ${caption}`}>
      <Text variant="labelMedium" color={c.ink2} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading2" numberOfLines={1} tabular>
        {value}
      </Text>
      <Text variant="captionStrong" color={c.brandText} numberOfLines={1} tabular>
        {caption}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  tile: { flex: 1, gap: 4, padding: 14, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
}));
