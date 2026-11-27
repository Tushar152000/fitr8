import { Pencil } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Sheet } from "@/components/sheet";
import { Glass } from "./glass";
import { HydrationGlow } from "./hydration-glow";
import { FieldError, PressableScale, Text } from "@/components/ui";
import { GLASS_SIZES, glassRow, setGlassMl, useGlassMl, type GlassRow } from "@/lib/glass-size";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { useWater } from "@/lib/use-water";

const L = (ml: number) => (Math.round(ml / 100) / 10).toFixed(1);

// The card is always dark (both themes): bg/inverse with the Figma hydration glow along the bottom
// edge, drawn with gradients (./hydration-glow.tsx), and Figma's soft blue drop shadow.

/**
 * Home v2 hydration card: litres left, one tap per glass. An empty glass adds a glass, the last
 * full one takes it back off (undo). The pencil changes the glass size (a phone setting). Up to 8
 * glasses show as-is; a bigger target keeps the last glass empty to add more, and each extra glass
 * fills it, then stacks onto the glass before it as "×2", "×3" … (lib/glass-size `glassRow`).
 */
export function HydrationCard() {
  const styles = useStyles();
  const water = useWater();
  const glass = useGlassMl();
  const [sizing, setSizing] = useState(false);
  const d = water.water.data;
  const error = water.add.error ?? water.undo.error;
  const row = d ? glassRow(d.consumedMl, d.targetMl, glass) : null;

  return (
    <View style={styles.card}>
      <HydrationGlow />
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 0 }}>
          <Text variant="labelMedium" color="#ffffff" style={{ letterSpacing: -0.24 }}>
            Current hydration
          </Text>
          {d ? (
            // Always one line, so the card never changes height when the target is reached (a wrap
            // on a narrow phone pushed everything below down).
            <Text
              weight={600}
              size={22}
              color="#ffffff"
              tabular
              accessibilityLiveRegion="polite"
              numberOfLines={1}
              style={styles.big}
            >
              {d.consumedMl >= d.targetMl ? "Target reached" : `${L(d.targetMl - d.consumedMl)} L left`}
              <Text weight={500} size={14} color="rgba(255,255,255,0.65)" tabular style={styles.big}>
                {d.consumedMl >= d.targetMl ? "" : ` of\u00a0${L(d.targetMl)}\u00a0L`}
              </Text>
            </Text>
          ) : (
            <View style={{ height: 27 }} />
          )}
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Glass size ${glass} ml. Change`}
          onPress={() => setSizing(true)}
          hitSlop={10}
          style={styles.size}
        >
          <Glass full still size={15} />
          <Text variant="labelRegular" color="#ffffff" tabular style={{ letterSpacing: -0.24 }}>
            = {glass} ml
          </Text>
          <Pencil size={13} color="#ffffff" />
        </PressableScale>
      </View>

      {d ? (
        <>
          <Glasses
            row={row!}
            glass={glass}
            leftMl={Math.max(0, d.targetMl - d.consumedMl)}
            canUndo={Boolean(water.undoable)}
            onAdd={(ml) => water.add.mutate(ml)}
            onUndo={() => {
              if (water.undoable) water.undo.mutate(water.undoable.id);
            }}
          />
          {error && <FieldError>{error.message || "Couldn't save. Try again."}</FieldError>}
        </>
      ) : (
        <View style={{ height: 44 }} />
      )}

      <Sheet open={sizing} onClose={() => setSizing(false)} title="Glass size">
        <View style={styles.sizes}>
          {GLASS_SIZES.map((ml) => (
            <SizeChip
              key={ml}
              ml={ml}
              selected={ml === glass}
              onPress={() => {
                setGlassMl(ml);
                setSizing(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const GLASS = 34;
/** The last glass of an uneven target is drawn smaller: capacity 0.6 → 60 % size (never under 40 %). */
const glassSize = (capacity: number) => Math.round(GLASS * Math.max(0.4, capacity));

function Glasses({
  row,
  glass,
  leftMl,
  canUndo,
  onAdd,
  onUndo,
}: {
  row: GlassRow;
  glass: number;
  /** Water left to the target: a tap never adds more than this (the final, smaller glass). */
  leftMl: number;
  canUndo: boolean;
  onAdd: (ml: number) => void;
  onUndo: () => void;
}) {
  const styles = useStyles();
  const { glasses, next, undoAt, stack, stacked } = row;
  // When a glass stacks, the last glass shows full for a moment, then empties into the ×n glass.
  const [shownStack, setShownStack] = useState(stack);
  useEffect(() => {
    if (stack === shownStack) return;
    const t = setTimeout(() => setShownStack(stack), stack > shownStack ? 650 : 0);
    return () => clearTimeout(t);
  }, [stack, shownStack]);
  const pouring = stack > shownStack;
  const lastIndex = glasses.length - 1;
  // A part-filled glass is both the next to fill and the last with water: undo it with a long press.
  const undoOnNext = canUndo && undoAt === next;

  return (
    <View style={[styles.glasses, glasses.length < 6 && styles.glassesShort]}>
      {glasses.map((g, i) => {
        // Every glass that isn't full shows a "+": tapping any of them adds one glass (it fills in order).
        const adds = next !== -1 && (g.level < 0.999 || (stacked && i === lastIndex));
        const undoes = !adds && i === undoAt && canUndo;
        // A tap adds one glass of water, or only what's left near the target (API minimum 50 ml).
        const ml = Math.max(50, Math.round(Math.min(glass, leftMl)));
        const level = pouring && i === lastIndex ? 1 : g.level;
        const badge = stacked && i === lastIndex - 1 ? (pouring ? shownStack : stack) : 0;
        const label = adds
          ? `Add a glass, ${ml} ml${undoOnNext && i === next ? ". Long press to remove the last one" : ""}`
          : i === undoAt
            ? "Remove the last glass"
            : g.level > 0
              ? `Glass ${i + 1}, drunk${badge > 1 ? `, ${badge} glasses` : ""}`
              : `Glass ${i + 1}`;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !adds && !undoes }}
            disabled={!adds && !undoes}
            onPress={adds ? () => onAdd(ml) : onUndo}
            onLongPress={adds && undoOnNext && i === next ? onUndo : undefined}
            hitSlop={4}
            style={({ pressed }) => [styles.glass, pressed && { opacity: 0.6 }]}
          >
            <Glass level={level} size={glassSize(g.capacity)} />
            {badge > 1 && (
              // A subscript at the glass's lower-right corner: "×7" in aqua, on a cut-out of the card.
              <View style={styles.badge}>
                <Text weight={700} size={11} color="#35cefe" tabular style={{ lineHeight: 13 }}>
                  ×{badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function SizeChip({ ml, selected, onPress }: { ml: number; selected: boolean; onPress: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: c.ink }]}
    >
      <Text weight={600} color={selected ? c.surface : c.ink} tabular>
        {ml} ml
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    minHeight: 137,
    borderRadius: radius.card,
    padding: 20,
    gap: 18,
    overflow: "hidden",
    backgroundColor: c.panel,
    // Dark mode: a lifted dark (#161616) with a faint edge, so it doesn't vanish on the black page.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.panelLine,
    boxShadow: "0 20px 20px rgba(0, 119, 255, 0.02)",
  },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  big: { letterSpacing: -0.56 },
  size: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 15 },
  glasses: { flexDirection: "row", justifyContent: "space-between", marginVertical: -5 },
  badge: {
    position: "absolute",
    bottom: 1,
    right: -9,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: c.panel, // the card, so the count cuts cleanly over the glass outline
    pointerEvents: "none",
  },
  // A short row (small target or big glass) sits at the left instead of stretching across.
  glassesShort: { justifyContent: "flex-start", gap: 14 },
  glass: { minWidth: 34, minHeight: 44, alignItems: "center", justifyContent: "flex-end", paddingBottom: 5 },
  // Three equal columns, edge to edge with the sheet's gutter.
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexGrow: 1,
    flexBasis: "30%",
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: c.chip,
    alignItems: "center",
    justifyContent: "center",
  },
}));
