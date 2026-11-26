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
 * Home v2 hydration card: litres left, one tap per glass. An empty glass adds a glass, the last
 * full one takes it back off (undo). The pencil changes the glass size (a phone setting). All glasses
 * show in one row; a target of more than 8 glasses shares 8 glasses, so a tap fills part of one.
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
            <Text weight={600} size={22} color="#ffffff" tabular accessibilityLiveRegion="polite" style={styles.big}>
              {d.consumedMl >= d.targetMl ? "Target reached" : `${L(d.targetMl - d.consumedMl)} L left`}
              <Text weight={500} size={14} color="rgba(255,255,255,0.65)" tabular style={styles.big}>
                {" "}
                of {L(d.targetMl)} L
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
  /** Water left to the target: the final (possibly smaller) glass adds exactly this. */
  leftMl: number;
  canUndo: boolean;
  onAdd: (ml: number) => void;
  onUndo: () => void;
}) {
  const styles = useStyles();
  const { glasses, next, last } = row;
  // Undo lives on the last glass with water that isn't the one the next tap fills: when glasses are
  // shared, the part-filled glass is both, so undo moves to the full glass before it. The first
  // part-filled glass (nothing before it) undoes with a long press.
  const undoAt = next === -1 ? last : last === next ? next - 1 : last;
  const undoOnNext = canUndo && last === next && next === 0;
  return (
    <View style={[styles.glasses, glasses.length < 6 && styles.glassesShort]}>
      {glasses.map((g, i) => {
        const adds = i === next;
        const undoes = !adds && i === undoAt && canUndo;
        // A tap adds one glass of water, or only what's left near the target (API minimum 50 ml).
        const ml = Math.max(50, Math.round(Math.min(glass, leftMl)));
        const label = adds
          ? `Add a glass, ${ml} ml${undoOnNext && adds ? ". Long press to remove the last one" : ""}`
          : i === undoAt
            ? "Remove the last glass"
            : g.level > 0
              ? `Glass ${i + 1}, drunk`
              : `Glass ${i + 1}`;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !adds && !undoes }}
            disabled={!adds && !undoes}
            onPress={adds ? () => onAdd(ml) : onUndo}
            onLongPress={adds && undoOnNext ? onUndo : undefined}
            hitSlop={4}
            style={({ pressed }) => [styles.glass, pressed && { opacity: 0.6 }]}
          >
            <Glass level={g.level} size={glassSize(g.capacity)} />
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
    padding: 18,
    gap: 18,
    overflow: "hidden",
    backgroundColor: INVERSE,
    boxShadow: "0 20px 20px rgba(0, 119, 255, 0.02)",
  },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  big: { letterSpacing: -0.56 },
  size: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 15 },
  glasses: { flexDirection: "row", justifyContent: "space-between", marginVertical: -5 },
  // A short row (small target or big glass) sits at the left instead of stretching across.
  glassesShort: { justifyContent: "flex-start", gap: 14 },
  glass: { minWidth: 34, minHeight: 44, alignItems: "center", justifyContent: "flex-end", paddingBottom: 5 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 },
  chip: {
    minWidth: 92,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: c.chip,
    alignItems: "center",
    justifyContent: "center",
  },
}));
