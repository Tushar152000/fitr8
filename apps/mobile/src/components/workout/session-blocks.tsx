import type { SessionBlock, TrainingDayDto } from "@fitr8/contracts";
import { View } from "react-native";
import { Section, Text } from "@/components/ui";
import { dayColors } from "@/lib/training";
import { useColors, type Colors } from "@/lib/theme";
import { TrackBar } from "./track-bar";

const intensityColor = (c: Colors, i: SessionBlock["intensity"], fg: string) =>
  i === "hard" ? c.fat : i === "steady" ? fg : i === "rest" ? c.dayRest : c.track;

/** "The session" (16d): the blocks as one bar sized by minutes, coloured by intensity, and the easy pace. */
export function SessionBlocks({ day }: { day: TrainingDayDto }) {
  const c = useColors();
  const col = dayColors(c, day.type);
  const total = day.blocks.reduce((t, b) => t + b.minutes, 0) || 1;
  return (
    <Section title="The session">
      <TrackBar accessible accessibilityLabel={day.blocks.map((b) => `${b.label} ${b.minutes} min`).join(", ")}>
        {day.blocks.map((b, i) => (
          <View
            key={i}
            style={{
              flex: b.minutes / total,
              backgroundColor: intensityColor(c, b.intensity, col.fg),
              marginLeft: i ? 2 : 0,
            }}
          />
        ))}
      </TrackBar>
      {day.pace && (
        <Text size={13} color={c.ink2}>
          Easy pace: {day.pace}. If you can&apos;t talk in full sentences, slow down.
        </Text>
      )}
    </Section>
  );
}
