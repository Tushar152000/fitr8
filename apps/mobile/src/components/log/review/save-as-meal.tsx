import { Bookmark, BookmarkCheck } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Under the items: "Save as a meal for next time", then a green note once it's saved. */
export function SaveAsMeal({ savedAs, onSave }: { savedAs: string | null; onSave: () => void }) {
  const c = useColors();
  const styles = useStyles();
  if (savedAs) {
    return (
      <View style={styles.savedAs} accessibilityLiveRegion="polite">
        <BookmarkCheck size={18} color={c.protein} />
        <Text weight={600} size={13} color={c.protein} style={{ flex: 1 }}>
          Saved as &quot;{savedAs}&quot; — one tap to log it next time
        </Text>
      </View>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityHint="Saves these items so you can log them again with one tap"
      onPress={onSave}
      style={styles.saveAs}
    >
      <Bookmark size={18} color={c.brandText} />
      <Text weight={600} size={14} color={c.brandText}>
        Save as a meal for next time
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  saveAs: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44 },
  savedAs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: radius.card,
    backgroundColor: c.proteinSoft,
    paddingHorizontal: 16,
  },
}));
