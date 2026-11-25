import { View } from "react-native";
import { Segmented, Text } from "@/components/ui";
import { useAppearance, useColors, type AppearancePreference } from "@/lib/theme";

/** System (follow the phone), or always light / always dark. Applies instantly and is remembered. */
export function AppearancePicker() {
  const c = useColors();
  const { preference, setPreference } = useAppearance();
  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Segmented<AppearancePreference>
        label="Theme"
        value={preference}
        onChange={setPreference}
        options={[
          { value: "system", label: "System" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
      />
      <Text size={13} color={c.ink3}>
        {preference === "system"
          ? "Matches your phone's light or dark setting."
          : "Stays the same whatever your phone uses."}
      </Text>
    </View>
  );
}
