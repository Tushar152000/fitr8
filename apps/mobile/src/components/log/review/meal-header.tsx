import type { MealDetailDto } from "@fitr8/contracts";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronLeft, NotebookPen } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { MEAL_LABEL } from "@/lib/format";
import { useColors } from "@/lib/theme";
import { ScanLine } from "./scan-line";

/**
 * Top of meal review: the photo full-bleed (with the scan line while it's read), or for a typed meal
 * a line with the slot and what was typed. Back always returns to Today.
 */
export function MealHeader({
  meal,
  scanning,
  top,
}: {
  meal: Pick<MealDetailDto, "photoUrl" | "mealType" | "inputText">;
  scanning: boolean;
  /** The safe-area top inset. */
  top: number;
}) {
  const c = useColors();
  if (meal.photoUrl) {
    return (
      <View style={{ height: 224 + top, backgroundColor: c.sunken, overflow: "hidden" }}>
        <Image
          source={{ uri: meal.photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={`Your ${MEAL_LABEL[meal.mealType].toLowerCase()} photo`}
        />
        {scanning && <ScanLine height={224 + top} />}
        <View style={{ position: "absolute", top: top + 8, left: 12 }}>
          <BackToToday onPhoto />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: top + 8 }}>
      <BackToToday onPhoto={false} />
      <NotebookPen size={16} color={c.ink3} />
      <Text weight={600} size={13} color={c.ink3} numberOfLines={1} style={{ flex: 1 }}>
        {MEAL_LABEL[meal.mealType]}
        {meal.inputText ? ` · “${meal.inputText}”` : ""}
      </Text>
    </View>
  );
}

/** Round back button; on a photo it sits on a dark disc so it stays readable. */
function BackToToday({ onPhoto }: { onPhoto: boolean }) {
  const c = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Back to today"
      onPress={() => router.dismissTo("/today")}
      style={[styles.back, onPhoto && { backgroundColor: "rgba(23,24,28,0.55)" }]}
    >
      <ChevronLeft size={26} color={onPhoto ? c.white : c.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
