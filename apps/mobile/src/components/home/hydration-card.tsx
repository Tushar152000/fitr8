import { Image } from "expo-image";
import { Pencil } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Glass } from "./glass";
import { FieldError, PressableScale, Text } from "@/components/ui";
import { GLASS_SIZES, glassRow, setGlassMl, useGlassMl, type GlassRow } from "@/lib/glass-size";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { useWater } from "@/lib/use-water";

const L = (ml: number) => (Math.round(ml / 100) / 10).toFixed(1);

// The card is always dark (both themes): bg/inverse with the Figma hydration glow (blurred aqua
// strokes along the bottom edge), exported from the design as a 350 × 137 image and stretched to fit.
const INVERSE = "#0c0c0c";
const GLOW = require("../../../assets/home/hydration-glow.png");

/**
 * Home v2 hydration card: litres left and a row of glasses (lib/glass-size `glassRow`). Every glass
 * starts empty and they fill in order, one per tap on any glass that isn't full; a tap on a full
 * glass takes the last glass back. Once the row is full, a "+" glass adds more, counted under it as
 * ×1, ×2 … (it never fills). The pencil changes the glass size (a phone setting).
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
      <Image source={GLOW} style={StyleSheet.absoluteFill} contentFit="fill" accessibilityIgnoresInvertColors />
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
            consumedMl={d.consumedMl}
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
  consumedMl,
  canUndo,
  onAdd,
  onUndo,
}: {
  row: GlassRow;
  glass: number;
  consumedMl: number;
  canUndo: boolean;
  onAdd: (ml: number) => void;
  onUndo: () => void;
}) {
  const styles = useStyles();
  const { glasses, plus, extra, rowMl } = row;
  // A row glass adds one glass of water, or only what the row still holds (its last, smaller glass);
  // the "+" glass always adds a whole glass. The API's minimum is 50 ml.
  const rowAddMl = Math.max(50, Math.round(Math.min(glass, rowMl - consumedMl)));
  const slots = glasses.length + (plus ? 1 : 0);

  return (
    <View style={[styles.glasses, slots < 6 && styles.glassesShort]}>
      {glasses.map((g, i) => {
        const full = g.level >= 0.999;
        // Any glass that isn't full adds the next glass (they fill in order, whichever is tapped);
        // any full glass takes the last glass back.
        const adds = !full;
        const undoes = full && canUndo;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={
              adds ? `Add a glass, ${rowAddMl} ml` : `Glass ${i + 1}, drunk. Tap to remove the last glass`
            }
            accessibilityState={{ disabled: !adds && !undoes }}
            disabled={!adds && !undoes}
            onPress={adds ? () => onAdd(rowAddMl) : onUndo}
            hitSlop={4}
            style={({ pressed }) => [styles.glass, pressed && { opacity: 0.6 }]}
          >
            <Glass level={g.level} size={glassSize(g.capacity)} />
          </Pressable>
        );
      })}
      {plus && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add another glass, ${glass} ml${extra > 0 ? `. ${extra} extra so far` : ""}`}
          onPress={() => onAdd(glass)}
          hitSlop={4}
          style={({ pressed }) => [styles.glass, pressed && { opacity: 0.6 }]}
        >
          {/* Never fills: the glasses past the row are counted under it. */}
          <Glass level={0} size={GLASS} />
          {extra > 0 && (
            <View style={styles.count}>
              <Text weight={700} size={11} color="#35cefe" tabular style={{ lineHeight: 13 }}>
                ×{extra}
              </Text>
            </View>
          )}
        </Pressable>
      )}
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
    backgroundColor: INVERSE,
    boxShadow: "0 20px 20px rgba(0, 119, 255, 0.02)",
  },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  big: { letterSpacing: -0.56 },
  size: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 15 },
  glasses: { flexDirection: "row", justifyContent: "space-between", marginVertical: -5 },
  // "×n" under the "+" glass: the glasses drunk past the row.
  count: { position: "absolute", bottom: -12, left: 0, right: 0, alignItems: "center", pointerEvents: "none" },
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
