import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { makeStyles, radius } from "@/lib/theme";
import { Text } from "./text";

/**
 * A titled group of rows on one surface card with hairline dividers between them (Profile's
 * Body / Food / Settings groups). Falsy children are skipped, so rows can be conditional.
 */
export function ListCard({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  const items = Children.toArray(children);
  return (
    <View style={{ gap: 8 }} accessibilityLabel={title}>
      <Text variant="h2">{title}</Text>
      <View style={styles.card}>
        {items.map((child, i) => (
          <View key={i} style={i > 0 && styles.divider}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { borderRadius: radius.card, backgroundColor: c.surface },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
}));
