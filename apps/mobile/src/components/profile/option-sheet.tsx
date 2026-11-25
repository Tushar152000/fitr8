import { Check } from "lucide-react-native";
import { Sheet } from "@/components/sheet";
import { MenuGroup, MenuRow, StatusPill, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

export type SheetOption<T extends string> = {
  value: T;
  label: string;
  sub?: string;
  /** Shown but not choosable yet ("Coming soon"). */
  soon?: boolean;
};

/** A bottom sheet with one choice per row (Settings → Units, Appearance): the picked one ticked. */
export function OptionSheet<T extends string>({
  open,
  title,
  note,
  options,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  note?: string;
  options: SheetOption<T>[];
  value: T;
  onPick: (value: T) => void;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <MenuGroup dividerInset={0}>
        {options.map((o) => (
          <MenuRow
            key={o.value}
            title={o.label}
            subtitle={o.sub}
            selected={o.value === value}
            onPress={o.soon ? undefined : () => onPick(o.value)}
            trailing={
              o.soon ? (
                <StatusPill label="Coming soon" tone="neutral" icon={null} />
              ) : o.value === value ? (
                <Check size={18} color={c.brandText} strokeWidth={2.5} />
              ) : null
            }
          />
        ))}
      </MenuGroup>
      {note ? (
        <Text variant="labelRegular" style={{ lineHeight: 18 }}>
          {note}
        </Text>
      ) : null}
    </Sheet>
  );
}
