import { TriangleAlert } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { VerifiedBadge } from "../verified-badge";

/** Design 7g: whether protein, carbs and fat add up to the energy on the label. */
export function LabelCheck({ ok, fromMacros, kcal }: { ok: boolean; fromMacros: number; kcal: number }) {
  const c = useColors();
  const styles = useStyles();
  if (ok) return <VerifiedBadge>Numbers add up</VerifiedBadge>;
  return (
    <View style={styles.warn}>
      <TriangleAlert size={20} color={c.cautionText} />
      <Text size={13} color={c.cautionText} style={{ flex: 1 }}>
        <Text size={13} weight={700} color={c.cautionText}>
          Please check.
        </Text>{" "}
        Protein, carbs and fat add up to {formatInt(fromMacros)} kcal, but energy says {formatInt(kcal)} kcal.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  warn: { flexDirection: "row", gap: 10, borderRadius: radius.card, backgroundColor: c.cautionSoft, padding: 12 },
}));
