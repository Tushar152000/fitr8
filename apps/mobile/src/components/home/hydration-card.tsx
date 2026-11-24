import { LinearGradient } from "expo-linear-gradient";
import { Pencil } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Glass } from "./glass";
import { FieldError, Text } from "@/components/ui";
import { useWater } from "@/components/water-card";
import { GLASS_SIZES, glassRow, setGlassMl, useGlassMl } from "@/lib/glass-size";
import { makeStyles, radius, useColors } from "@/lib/theme";

const L = (ml: number) => (Math.round(ml / 100) / 10).toFixed(1);

// The card is always dark (both themes): bg/inverse into data/hydration-1, fixed like the camera screens.
const GRADIENT = ["#0c0c0c", "#0c1014", "#164a5f", "#2f97c1"] as const;
const GRADIENT_AT = [0, 0.45, 0.85, 1] as const;

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
  const busy = water.add.isPending || water.undo.isPending;
  const error = water.add.error ?? water.undo.error;

  return (
    <LinearGradient colors={GRADIENT} locations={GRADIENT_AT} style={styles.card}>
      <View style={styles.head}>
        <Text size={13} weight={500} color="rgba(255,255,255,0.85)">
          Current hydration
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Glass size ${glass} ml. Change`}
          onPress={() => setSizing(true)}
          hitSlop={10}
          style={styles.size}
        >
          <Glass full still size={16} />
          <Text size={12} color="rgba(255,255,255,0.85)" tabular>
            = {glass} ml
          </Text>
          <Pencil size={13} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>

      {d ? (
        <>
          <Text weight={700} size={26} color="#ffffff" tabular accessibilityLiveRegion="polite">
            {d.consumedMl >= d.targetMl ? "Target reached" : `${L(d.targetMl - d.consumedMl)} L left`}
            <Text size={13} color="rgba(255,255,255,0.6)" tabular>
              {"  "}of {L(d.targetMl)} L
            </Text>
          </Text>
          <Glasses
            consumedMl={d.consumedMl}
            targetMl={d.targetMl}
            glass={glass}
            busy={busy}
            canUndo={d.logs.length > 0}
            onAdd={() => water.add.mutate(glass)}
            onUndo={() => {
              const last = d.logs.at(-1);
              if (last) water.undo.mutate(last.id);
            }}
          />
          {error && <FieldError>{error.message || "Couldn't save. Try again."}</FieldError>}
        </>
      ) : (
        <View style={{ height: 78 }} />
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
    </LinearGradient>
  );
}

function Glasses({
  consumedMl,
  targetMl,
  glass,
  busy,
  canUndo,
  onAdd,
  onUndo,
}: {
  consumedMl: number;
  targetMl: number;
  glass: number;
  busy: boolean;
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
        const next = i === filled;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={
              full ? (last ? `Remove the last glass` : `Glass ${i + 1}, drunk`) : `Add a glass, ${glass} ml`
            }
            accessibilityState={{ disabled: busy || (full && !(last && canUndo)) }}
            disabled={busy || (full && !(last && canUndo))}
            onPress={full ? onUndo : onAdd}
            hitSlop={4}
            style={({ pressed }) => [styles.glass, pressed && { opacity: 0.6 }, busy && next && { opacity: 0.5 }]}
          >
            <Glass full={full} size={32} />
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
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: c.ink }]}
    >
      <Text weight={600} color={selected ? c.surface : c.ink} tabular>
        {ml} ml
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: { borderRadius: radius.card, padding: 16, gap: 12, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  size: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32 },
  glasses: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  glass: { minWidth: 32, minHeight: 44, alignItems: "center", justifyContent: "center" },
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
