import { HeartPulse, Lock } from "lucide-react-native";
import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

const PROMISES = [
  "Read only: FITR8 never changes your health data",
  "Saved securely to your FITR8 account, never sold or used for ads",
  "Disconnect or delete it all at any time",
];

/** Before connecting: what FITR8 reads from Apple Health / Health Connect and how it's kept. */
export function ConnectIntro({ label }: { label: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.iconTile}>
        <HeartPulse size={22} color={c.white} />
      </View>
      <Text variant="h2">See your health data next to your food</Text>
      <Text color={c.ink2}>
        Connect {label} and FITR8 shows your steps, heart rate, BMI, blood oxygen, sleep and recovery, and your coach
        adjusts your training to how you slept.
      </Text>
      <View style={{ gap: 8 }}>
        {PROMISES.map((line) => (
          <View key={line} style={{ flexDirection: "row", gap: 8 }}>
            <Lock size={14} color={c.protein} style={{ marginTop: 3 }} />
            <Text size={14} color={c.ink2} style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>
      <Text size={12} color={c.ink3}>
        On the next screen, {label} asks which data to share. Allow what you&apos;re comfortable with; FITR8 works with
        any of it.
      </Text>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.fat,
    alignItems: "center",
    justifyContent: "center",
  },
}));
