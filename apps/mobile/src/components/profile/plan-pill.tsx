import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/** The grey "Free" pill (profile header and the free plan card). */
export function PlanPill({ label, size }: { label: string; size: number }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.pill}>
      <Text weight={600} size={size} color={c.ink2}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pill: { borderRadius: 999, backgroundColor: c.chip, paddingHorizontal: 10, paddingVertical: 2 },
}));
