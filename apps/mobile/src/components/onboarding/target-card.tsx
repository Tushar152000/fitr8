import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors, type Colors } from "@/lib/theme";
import type { PlanSummary } from "@/lib/types-plan";

/** Dots on the dark target card; protein and fat are lifted shades that read on the panel. */
const macroDots = (c: Colors) => ({ protein: "#5fae88", carbs: c.carbs, fat: "#9d84d6" });

/** The dark "Daily target" card: kcal, maintenance and the deficit or surplus, the macro split and grams. */
export function TargetCard({ summary }: { summary: PlanSummary }) {
  const c = useColors();
  const styles = useStyles();
  const MACRO_DOTS = macroDots(c);
  const { kcal, proteinG, carbsG, fatG } = summary.target;
  const adjustment = kcal - summary.plan.tdee;
  const k = { p: proteinG * 4, c: carbsG * 4, f: fatG * 9 };
  const total = k.p + k.c + k.f || 1;
  const white70 = "rgba(255,255,255,0.7)";
  return (
    <Card dark style={{ padding: 20, gap: 0, borderRadius: radius.card }}>
      <Text variant="labelStrong" color={white70}>
        Daily target
      </Text>
      <Text variant="display" color={c.white} tabular>
        {formatInt(kcal)}{" "}
        <Text variant="bodyStrong" color={white70} style={{ letterSpacing: 0 }}>
          kcal
        </Text>
      </Text>
      <Text variant="labelRegular" color={white70} tabular style={{ marginTop: 6 }}>
        Maintenance {formatInt(summary.plan.tdee)} kcal
        {Math.abs(adjustment) >= 10 &&
          ` ${adjustment < 0 ? "−" : "+"} ${formatInt(Math.abs(adjustment))} kcal ${adjustment < 0 ? "deficit" : "surplus"}`}
      </Text>
      <View
        style={styles.split}
        accessible
        accessibilityLabel={`Split: protein ${Math.round((k.p / total) * 100)}%, carbs ${Math.round((k.c / total) * 100)}%, fat ${Math.round((k.f / total) * 100)}% of calories`}
      >
        <View style={{ flex: k.p, backgroundColor: MACRO_DOTS.protein }} />
        <View style={{ flex: k.c, backgroundColor: MACRO_DOTS.carbs }} />
        <View style={{ flex: k.f, backgroundColor: MACRO_DOTS.fat }} />
      </View>
      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <Macro label="Protein" grams={proteinG} dot={MACRO_DOTS.protein} />
        <Macro label="Carbs" grams={carbsG} dot={MACRO_DOTS.carbs} />
        <Macro label="Fat" grams={fatG} dot={MACRO_DOTS.fat} />
      </View>
    </Card>
  );
}

function Macro({ label, grams, dot }: { label: string; grams: number; dot: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
        <Text variant="labelRegular" color="rgba(255,255,255,0.7)">
          {label}
        </Text>
      </View>
      <Text variant="heading3" color={c.white} tabular>
        {grams} g
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  split: { flexDirection: "row", height: 10, gap: 2, borderRadius: 5, overflow: "hidden", marginTop: 16 },
}));
