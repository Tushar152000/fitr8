import { View } from "react-native";
import { Line } from "@/components/skeletons";
import { Text } from "@/components/ui";
import type { CoachMessage } from "@/lib/use-coach-chat";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { ToolStatusChip } from "./tool-status-chip";

/**
 * One message in the coach thread. Yours sits right on the strong tone; the coach's sits left on
 * the surface, with its tool chips above, "Thinking…" until the first words, and a note if it was cut.
 */
export function Bubble({ message: m }: { message: CoachMessage }) {
  const c = useColors();
  const styles = useStyles();
  if (m.role === "user") {
    return (
      <View style={[styles.bubble, styles.mine]}>
        <Text color={c.onStrong}>{m.text}</Text>
      </View>
    );
  }
  const thinking = m.streaming && !m.text && m.tools.every((t) => t.status !== "running");
  return (
    <View style={{ gap: 8, alignSelf: "stretch" }}>
      {m.tools.length > 0 && (
        <View style={styles.tools}>
          {m.tools.map((t) => (
            <ToolStatusChip key={t.id} tool={t} />
          ))}
        </View>
      )}
      {(m.text || thinking) && (
        <View style={[styles.bubble, styles.theirs]} accessibilityLiveRegion={m.streaming ? "polite" : "none"}>
          {m.text ? <Text>{m.text}</Text> : <Text color={c.ink3}>Thinking…</Text>}
        </View>
      )}
      {m.cut && <Text variant="meta">Reply stopped before it finished.</Text>}
    </View>
  );
}

/** The thread while the last chat loads: coach bubbles of skeleton lines around one of yours. */
export function ThreadSkeleton() {
  const styles = useStyles();
  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.bubble, styles.theirs, { gap: 8 }]}>
        <Line tone="card" width="90%" />
        <Line tone="card" width="70%" />
      </View>
      <View style={{ alignSelf: "flex-end", width: "60%" }}>
        <Line height={40} />
      </View>
      <View style={[styles.bubble, styles.theirs, { gap: 8 }]}>
        <Line tone="card" width="80%" />
        <Line tone="card" width="95%" />
        <Line tone="card" width="40%" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bubble: { maxWidth: "88%", borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12 },
  mine: { alignSelf: "flex-end", backgroundColor: c.strong, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: c.surface, borderBottomLeftRadius: 6 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
}));
