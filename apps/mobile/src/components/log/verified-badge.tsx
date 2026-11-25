import { BadgeCheck } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/** Green pill with a check: "Exact label values", "Numbers add up". */
export function VerifiedBadge({ children }: { children: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.badge}>
      <BadgeCheck size={16} color={c.protein} />
      <Text weight={600} size={13} color={c.protein}>
        {children}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: c.proteinSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
}));
