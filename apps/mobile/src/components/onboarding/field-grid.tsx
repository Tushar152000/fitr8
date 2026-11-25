import type { ReactNode } from "react";
import { View } from "react-native";
import { makeStyles } from "@/lib/theme";

/** Two-up grid of number fields (height and weight, body measurements); wraps to a new row. */
export function FieldGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.grid}>{children}</View>;
}

/** One half-width cell of a FieldGrid; a lone last cell grows to the full row. */
export function FieldCell({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.cell}>{children}</View>;
}

const useStyles = makeStyles(() => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "47%", flexGrow: 1 },
}));
