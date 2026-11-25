import { Image } from "expo-image";
import { Pencil } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Glass } from "./glass";
import { FieldError, PressableScale, Text } from "@/components/ui";
import { GLASS_SIZES, glassRow, setGlassMl, useGlassMl } from "@/lib/glass-size";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { useWater } from "@/lib/use-water";

const L = (ml: number) => (Math.round(ml / 100) / 10).toFixed(1);

// The card is always dark (both themes): bg/inverse with the Figma hydration glow (blurred aqua
// strokes along the bottom edge), exported from the design as a 350 × 137 image and stretched to fit.
const INVERSE = "#0c0c0c";
const GLOW = require("../../../assets/home/hydration-glow.png");

/**
 * Home v2 hydration card: litres left, one tap per glass. An empty glass adds a glass, the last
 * full one takes it back off (undo). The pencil changes the glass size (a phone setting).
 */
export function HydrationCard() {
  const styles = useStyles();
  const water = useWater();
  const glass = useGlassMl();
  const [sizing, setSizing] = useState(false);
  const d = water.water.data;
  const error = water.add.error ?? water.undo.error;

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
            consumedMl={d.consumedMl}
            targetMl={d.targetMl}
            glass={glass}
            canUndo={Boolean(water.undoable)}
            onAdd={() => water.add.mutate(glass)}
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

function Glasses({
  consumedMl,
  targetMl,
  glass,
  canUndo,
  onAdd,
  onUndo,
}: {
  consumedMl: number;
  targetMl: number;
  glass: number;
  canUndo: boolean;
  onAdd: () => void;
  onUndo: () => void;
}) {
  const styles = useStyles();
  const { filled, slots } = glassRow(consumedMl, targetMl, glass);
  return (
    <View style={styles.glasses}>
      {Array.from({ length: slots }, (_, i) => {
        const full = i < filled;
        const last = full && i === filled - 1;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={
              full ? (last ? `Remove the last glass` : `Glass ${i + 1}, drunk`) : `Add a glass, ${glass} ml`
            }
            accessibilityState={{ disabled: full && !(last && canUndo) }}
            disabled={full && !(last && canUndo)}
            onPress={full ? onUndo : onAdd}
            hitSlop={4}
            style={({ pressed }) => [styles.glass, pressed && { opacity: 0.6 }]}
          >
            <Glass full={full} size={34} />
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
  glass: { minWidth: 34, minHeight: 44, alignItems: "center", justifyContent: "center" },
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
