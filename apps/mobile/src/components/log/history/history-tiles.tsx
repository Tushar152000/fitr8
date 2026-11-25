import type { HistoryDto } from "@fitr8/contracts";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Screen 12: the range's average on fully logged days and how many days were logged. */
export function HistoryTiles({ history, range }: { history: HistoryDto; range: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Tile label="Average on full days">
        {history.avgKcalFullDays == null ? "—" : formatInt(history.avgKcalFullDays)}
        {history.avgKcalFullDays != null && (
          <Text weight={600} size={13} color={c.ink3}>
            {" "}
            kcal
          </Text>
        )}
      </Tile>
      <Tile label="Days logged">
        {history.daysLogged}
        <Text weight={600} size={13} color={c.ink3}>
          {" "}
          of {range}
        </Text>
      </Tile>
    </View>
  );
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text weight={600} size={12} color={c.ink3}>
        {label}
      </Text>
      <Text variant="h2" size={22} tabular>
        {children}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tile: { flex: 1, borderRadius: radius.card, backgroundColor: c.surface, padding: 12 },
}));
