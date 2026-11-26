import { Bookmark, BookmarkCheck } from "lucide-react-native";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { PressableScale } from "@/components/ui";

/**
 * Icon-only "Save as a meal for next time", beside "+ Add item" on one line (user decision
 * 2026-11-27). Once saved it turns into a green bookmark-check; the toast from the save sheet says
 * the name.
 */
export function SaveAsMeal({ savedAs, onSave }: { savedAs: string | null; onSave: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const saved = Boolean(savedAs);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={saved ? `Saved as "${savedAs}"` : "Save as a meal for next time"}
      accessibilityHint={saved ? undefined : "Saves these items so you can log them again with one tap"}
      accessibilityState={{ disabled: saved }}
      disabled={saved}
      onPress={onSave}
      style={[styles.button, saved && { backgroundColor: c.proteinSoft, borderColor: "transparent" }]}
    >
      {saved ? <BookmarkCheck size={20} color={c.protein} /> : <Bookmark size={20} color={c.brandText} />}
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  // Same height and dashed outline as the "+ Add item" button beside it.
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.dash,
    alignItems: "center",
    justifyContent: "center",
  },
}));
