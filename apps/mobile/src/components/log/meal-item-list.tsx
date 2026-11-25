import { scaleRow, setRowGrams, type Row } from "@/lib/meal-rows";
import { MealItemEditor } from "./meal-item-editor";

/** The editable items of a meal: change a portion or an amount, or remove one. */
export function MealItemList({
  rows,
  onRowsChange,
}: {
  rows: Row[];
  onRowsChange: (update: (rows: Row[]) => Row[]) => void;
}) {
  return rows.map((row, i) => (
    <MealItemEditor
      key={row.key}
      item={row}
      onQuantityChange={(q) => onRowsChange((all) => all.map((r, j) => (j === i ? scaleRow(r, q) : r)))}
      onAmountChange={(g) => onRowsChange((all) => all.map((r, j) => (j === i ? setRowGrams(r, g) : r)))}
      onRemove={() => onRowsChange((all) => all.filter((_, j) => j !== i))}
    />
  ));
}
