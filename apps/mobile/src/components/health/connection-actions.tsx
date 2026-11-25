import { RefreshCw, Settings2, Trash2, Unlink } from "lucide-react-native";
import { MenuGroup, MenuRow } from "@/components/ui";
import { threeLetterMonths } from "@/lib/profile-summary";

/** "25 Nov, 9:41 am" */
const syncedAt = (iso: string) =>
  threeLetterMonths(
    new Date(iso).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }),
  );

/**
 * The connected health app's actions: sync now (with the last sync time), choose what it shares,
 * disconnect, or disconnect and delete what FITR8 synced.
 */
export function ConnectionActions({
  label,
  lastSyncAt,
  syncing,
  disconnecting,
  onSync,
  onOpenSettings,
  onDisconnect,
}: {
  label: string;
  lastSyncAt: string | null;
  syncing: boolean;
  disconnecting: boolean;
  onSync: () => void;
  onOpenSettings: () => void;
  onDisconnect: (deleteData: boolean) => void;
}) {
  return (
    <MenuGroup>
      <MenuRow
        icon={RefreshCw}
        accent
        title={syncing ? "Syncing…" : "Sync now"}
        subtitle={lastSyncAt ? `Last synced ${syncedAt(lastSyncAt)}` : "First sync in progress"}
        disabled={syncing}
        onPress={onSync}
      />
      <MenuRow icon={Settings2} title={`Choose what ${label} shares`} onPress={onOpenSettings} />
      <MenuRow icon={Unlink} title="Disconnect" disabled={disconnecting} onPress={() => onDisconnect(false)} />
      <MenuRow
        icon={Trash2}
        title="Disconnect and delete synced data"
        danger
        chevron={false}
        disabled={disconnecting}
        onPress={() => onDisconnect(true)}
      />
    </MenuGroup>
  );
}
