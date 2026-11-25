import type { ReminderDto } from "@fitr8/contracts";
import { BellRing } from "lucide-react-native";
import { MenuRow, Switch } from "@/components/ui";
import { localDate } from "@/lib/reminders";
import { formatNext } from "@/lib/reminder-format";

/**
 * One saved reminder as a Menu Row in the Custom reminders group: title, then when it rings (the
 * next time while it's on); tap the row to edit it, the switch turns it on or off.
 */
export function ReminderCard({
  reminder: r,
  busy,
  onToggle,
  onOpen,
}: {
  reminder: ReminderDto;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onOpen: () => void;
}) {
  const next = r.enabled && r.nextAt ? localDate(r.nextAt) : null;
  return (
    <MenuRow
      icon={BellRing}
      title={r.title}
      subtitle={next ? `${r.summary} · next ${formatNext(next)}` : r.summary}
      accessibilityLabel={`${r.title}, ${r.summary}. Edit`}
      onPress={onOpen}
      trailing={<Switch checked={r.enabled} onChange={(v) => !busy && onToggle(v)} label={`${r.title} on`} />}
    />
  );
}
