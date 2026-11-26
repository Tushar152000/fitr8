import type { MealDetailDto } from "@fitr8/contracts";
import { Image } from "expo-image";
import { ChevronLeft, NotebookPen } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { IconButton, Text } from "@/components/ui";
import { MEAL_LABEL } from "@/lib/format";
import { gutter, useColors } from "@/lib/theme";
import { useLeaveLog } from "@/lib/use-leave-log";
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
        <View style={{ position: "absolute", top: top + 8, left: gutter }}>
          <BackToToday />
        </View>
      </View>
    );
  }
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: gutter, paddingTop: top + 8 }}
    >
      <BackToToday />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <NotebookPen size={14} color={c.ink2} strokeWidth={2} />
        <Text variant="labelStrong" color={c.ink2} numberOfLines={1} style={{ flex: 1 }}>
          {MEAL_LABEL[meal.mealType]}
          {meal.inputText ? ` · “${meal.inputText}”` : ""}
        </Text>
      </View>
    </View>
  );
}

/** The v2 round back button (PageHeader's): white with the card lift, on the photo too. */
function BackToToday() {
  const c = useColors();
  // Back where logging started (Home or Meals), past the camera and Type (user decision 2026-11-27).
  const leaveLog = useLeaveLog();
  return <IconButton label="Close" onPress={leaveLog} icon={<ChevronLeft size={20} color={c.ink} strokeWidth={2} />} />;
}
