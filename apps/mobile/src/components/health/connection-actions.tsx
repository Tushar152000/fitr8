import { Settings2, Unlink, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui";
import { radius, useColors } from "@/lib/theme";

/** Choose what the health app shares, disconnect, or disconnect and delete what FITR8 synced. */
export function ConnectionActions({
  label,
  disconnecting,
  onOpenSettings,
  onDisconnect,
}: {
  label: string;
  disconnecting: boolean;
  onOpenSettings: () => void;
  onDisconnect: (deleteData: boolean) => void;
}) {
  const c = useColors();
  return (
    <View style={{ borderRadius: radius.card, backgroundColor: c.surface }}>
      <Row icon={Settings2} label={`Choose what ${label} shares`} onPress={onOpenSettings} />
      <Row icon={Unlink} label="Disconnect" onPress={() => onDisconnect(false)} disabled={disconnecting} />
      <Row
        icon={Unlink}
        label="Disconnect and delete synced data"
        danger
        onPress={() => onDisconnect(true)}
        disabled={disconnecting}
      />
    </View>
  );
}

function Row({
  icon: Icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? c.sunken : "transparent",
        borderRadius: radius.card,
      })}
    >
      <Icon size={18} color={danger ? c.danger : c.ink2} />
      <Text weight={600} color={danger ? c.danger : c.ink}>
        {label}
      </Text>
    </Pressable>
  );
}
