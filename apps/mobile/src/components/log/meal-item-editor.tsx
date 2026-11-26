import { Pencil, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Stepper, Text } from "@/components/ui";
import { formatInt, formatPortion, sentenceCase, unitStep } from "@/lib/format";
import { fonts, makeStyles, radius, useColors, INPUT_CARET } from "@/lib/theme";

const LOW_CONFIDENCE = 0.6;

export interface EditableItem {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  kcal: number;
  confidence?: number | null;
  approximate?: boolean;
  isLiquid?: boolean;
}

/** One detected item: name, portion, low-confidence flag, quantity stepper and kcal. */
export function MealItemEditor({
  item,
  onQuantityChange,
  onAmountChange,
  onRemove,
}: {
  item: EditableItem;
  onQuantityChange: (quantity: number) => void;
  /** Exact amount in g (ml for drinks). When set, tapping the portion line edits it. */
  onAmountChange?: (grams: number) => void;
  onRemove?: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const unsure = item.confidence != null && item.confidence < LOW_CONFIDENCE;
  const measure = item.isLiquid ? "ml" : "g";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const portion = `${formatPortion(item.quantity, item.unit, item.grams, item.isLiquid)}${item.approximate ? " · estimated" : ""}`;

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0 && n <= 3000) onAmountChange?.(n);
    setEditing(false);
  }

  return (
    <View style={[styles.card, unsure && styles.unsure]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="heading3">{sentenceCase(item.name)}</Text>
          {editing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <View style={styles.amountBox}>
                <TextInput
                  {...INPUT_CARET}
                  accessibilityLabel={`Amount in ${measure}`}
                  autoFocus
                  keyboardType="decimal-pad"
                  value={draft}
                  onChangeText={(v) => setDraft(v.replace(",", "."))}
                  onBlur={commit}
                  onSubmitEditing={commit}
                  style={styles.amountInput}
                />
                <Text variant="labelMedium" color={c.ink2}>
                  {measure}
                </Text>
              </View>
              <Pressable onPress={commit} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
                <Text variant="labelStrong" color={c.brandText}>
                  Done
                </Text>
              </Pressable>
            </View>
          ) : onAmountChange ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change amount, now ${Math.round(item.grams)} ${measure}`}
              onPress={() => {
                setDraft(String(Math.round(item.grams)));
                setEditing(true);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32, alignSelf: "flex-start" }}
            >
              <Text variant="labelMedium" color={c.ink2} tabular>
                {portion}
              </Text>
              <Pencil size={12} color={c.ink2} strokeWidth={2} />
            </Pressable>
          ) : (
            <Text variant="labelMedium" color={c.ink2} tabular>
              {portion}
            </Text>
          )}
          {unsure && (
            <View style={styles.tag}>
              <Text variant="captionStrong" color={c.cautionText}>
                Not sure — check this
              </Text>
            </View>
          )}
        </View>
        {onRemove && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            onPress={onRemove}
            style={{
              width: 44,
              height: 44,
              marginTop: -8,
              marginRight: -8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color={c.ink2} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Stepper
          label={`${item.name} quantity`}
          value={item.quantity}
          step={unitStep(item.unit)}
          onChange={onQuantityChange}
        />
        <Text variant="heading3" tabular>
          {formatInt(item.kcal)}{" "}
          <Text variant="labelMedium" color={c.ink2}>
            kcal
          </Text>
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 12, borderRadius: radius.card, backgroundColor: c.surface, padding: 16, ...shadows.card },
  unsure: { borderWidth: 1.5, borderColor: c.caution, padding: 14.5 },
  tag: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: c.cautionSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  amountBox: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.ink,
    borderRadius: radius.input,
    paddingHorizontal: 12,
  },
  amountInput: { width: 64, fontFamily: fonts.sans600, fontSize: 16, color: c.ink, padding: 0, outlineWidth: 0 },
}));
