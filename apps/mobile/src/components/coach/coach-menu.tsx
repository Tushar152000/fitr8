import { router } from "expo-router";
import { Brain, SquarePen, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** The coach header's sheet: start a new chat (when there is one to leave) or see what the coach remembers. */
export function CoachMenu({
  open,
  onClose,
  canStartNew,
  onNewChat,
}: {
  open: boolean;
  onClose: () => void;
  canStartNew: boolean;
  onNewChat: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Your coach">
      <View style={{ gap: 8, paddingBottom: 8 }}>
        {canStartNew && (
          <MenuRow
            icon={SquarePen}
            label="New chat"
            hint="Start fresh. Your coach still remembers what you told it."
            onPress={() => {
              onClose();
              onNewChat();
            }}
          />
        )}
        <MenuRow
          icon={Brain}
          label="What your coach remembers"
          hint="See or delete the things it keeps in mind."
          onPress={() => {
            onClose();
            router.push("/coach-memory");
          }}
        />
      </View>
    </Sheet>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: c.sunken }]}
    >
      <Icon size={20} color={c.ink} />
      <View style={{ flex: 1 }}>
        <Text weight={600}>{label}</Text>
        <Text size={13} color={c.ink3}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: radius.input },
}));
