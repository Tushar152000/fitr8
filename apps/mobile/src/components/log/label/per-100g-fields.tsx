import { StyleSheet, View } from "react-native";
import { NumberField } from "@/components/ui";

type Field = { label: string; unit: string; value: string; onChange: (value: string) => void };

/** The label's values per 100 g, two to a row. */
export function Per100gFields({ fields }: { fields: Field[] }) {
  return (
    <View style={styles.grid}>
      {fields.map((f) => (
        <View key={f.label} style={styles.cell}>
          <NumberField label={f.label} unit={f.unit} value={f.value} onValueChange={f.onChange} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "47%", flexGrow: 1 },
});
