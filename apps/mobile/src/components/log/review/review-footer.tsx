import { StyleSheet, View } from "react-native";
import { Button, FieldError, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, useColors } from "@/lib/theme";
import { TotalCard } from "../total-card";

/** Pinned under meal review: the meal's total and macros, any save error, and the save button. */
export function ReviewFooter({
  sum,
  error,
  onSave,
  saving,
  disabled,
  label,
  bottom,
}: {
  sum: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  error: string | null;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  label: string;
  /** The safe-area bottom inset. */
  bottom: number;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(16, bottom) }]}>
      <TotalCard kcal={sum.kcal} live>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Text weight={600} size={13} color={c.protein} tabular>
            {formatInt(sum.proteinG)} g protein
          </Text>
          <Text weight={600} size={13} color={c.carbsText} tabular>
            {formatInt(sum.carbsG)} g carbs
          </Text>
          <Text weight={600} size={13} color={c.fat} tabular>
            {formatInt(sum.fatG)} g fat
          </Text>
        </View>
      </TotalCard>
      {error && <FieldError>{error}</FieldError>}
      <Button onPress={onSave} loading={saving} disabled={disabled}>
        {label}
      </Button>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: c.ground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
}));
