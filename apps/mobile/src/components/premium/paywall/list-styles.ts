import { makeStyles, radius } from "@/lib/theme";

/**
 * The white card the paywall lists share (features, the comparison, billing notes, questions): the
 * v2 Group surface (radius 20, 16 px sides, 4 px top and bottom) with 1 px dividers between rows.
 */
export const useListStyles = makeStyles((c) => ({
  list: { backgroundColor: c.surface, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 56 },
}));
