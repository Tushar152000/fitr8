import { StyleSheet, View } from "react-native";
import { Button, FieldError, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { gutter, makeStyles, useColors } from "@/lib/theme";
import { TotalCard } from "../total-card";
import { useKeyboardVisible } from "@/lib/use-keyboard";

/**
 * Pinned under meal review: the meal's total and macros, any save error, and the save button (just
 * the button while the keyboard is up).
 */
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
  // While typing (a portion, the details note) only Save stays, right on the keyboard, so the field
  // being edited keeps the room; the total comes back when the keyboard closes.
  const keyboard = useKeyboardVisible();
  return (
    <View style={[styles.footer, { paddingBottom: keyboard ? 12 : Math.max(16, bottom) }]}>
      {!keyboard && (
        <TotalCard kcal={sum.kcal} live>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Text variant="labelStrong" color={c.protein} tabular>
              {formatInt(sum.proteinG)} g protein
            </Text>
            <Text variant="labelStrong" color={c.carbsText} tabular>
              {formatInt(sum.carbsG)} g carbs
            </Text>
            <Text variant="labelStrong" color={c.fat} tabular>
              {formatInt(sum.fatG)} g fat
            </Text>
          </View>
        </TotalCard>
      )}
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
    paddingHorizontal: gutter,
    gap: 12,
    backgroundColor: c.ground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
}));
