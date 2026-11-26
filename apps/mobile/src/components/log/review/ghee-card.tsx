import { Droplet } from "lucide-react-native";
import { MenuGroup, MenuRow, Switch } from "@/components/ui";

/** "Cooked with ghee or oil": adds one teaspoon of fat to the meal. A Menu Row with a switch (as Reminders). */
export function GheeCard({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <MenuGroup>
      <MenuRow
        icon={Droplet}
        title="Cooked with ghee or oil"
        subtitle="+45 kcal · +5 g fat (1 tsp)"
        trailing={<Switch checked={checked} onChange={onChange} label="Cooked with ghee or oil" />}
      />
    </MenuGroup>
  );
}
