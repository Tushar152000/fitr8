import { RefreshCw } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/** "Connected · synced 25 Nov, 9:41 am" with a sync-now button. */
export function SyncStatus({
  lastSyncAt,
  syncing,
  onSync,
}: {
  lastSyncAt: string | null;
  syncing: boolean;
  onSync: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={styles.dot} />
      <Text size={13} color={c.ink2} style={{ flex: 1 }}>
        Connected
        {lastSyncAt
          ? ` · synced ${new Date(lastSyncAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}`
          : " · syncing…"}
      </Text>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Sync now"
        onPress={onSync}
        disabled={syncing}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <RefreshCw size={20} color={syncing ? c.ink3 : c.brandText} />
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.protein },
}));
