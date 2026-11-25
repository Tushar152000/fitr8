/**
 * Which foods a user may see and log: everything except other users' unreviewed label scans
 * (an unverified LABEL_SCAN food is visible to its submitter only). A Prisma `where` fragment.
 */
export const visibleFoodTo = (userId: string) => ({
  OR: [{ verified: true }, { source: { not: "LABEL_SCAN" as const } }, { submittedById: userId }],
});
