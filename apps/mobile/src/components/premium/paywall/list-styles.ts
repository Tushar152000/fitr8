import { makeStyles, radius } from "@/lib/theme";

/** The bordered surface list the paywall sections share (features, tiers, billing notes). */
export const useListStyles = makeStyles((c) => ({
  list: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
  },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
}));
