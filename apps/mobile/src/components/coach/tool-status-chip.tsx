import { Check, CircleAlert, LoaderCircle } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import type { ToolChip } from "@/lib/use-coach-chat";
import { makeStyles, useColors } from "@/lib/theme";

/** A tool the coach ran for a reply: spinner while working, a tick when done, an alert if it failed. */
export function ToolStatusChip({ tool }: { tool: ToolChip }) {
  const c = useColors();
  const styles = useStyles();
  const Icon = tool.status === "running" ? LoaderCircle : tool.status === "done" ? Check : CircleAlert;
  const tint = tool.status === "done" ? c.protein : tool.status === "error" ? c.caution : c.ink3;
  return (
    <View style={styles.tool} accessibilityLabel={`${tool.label}${tool.status === "running" ? ", working" : ""}`}>
      <Icon size={14} color={tint} strokeWidth={2} />
      <Text weight={600} size={12} color={c.ink2}>
        {tool.label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tool: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.chip,
  },
}));
