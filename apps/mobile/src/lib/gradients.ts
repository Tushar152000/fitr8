/**
 * gradient/primary (colour system v2): black into olive #718B00. Fixed in both themes, like the
 * camera screens. Used by the round camera and send buttons and the Coach hero card.
 */
export const OLIVE_BUTTON = {
  colors: ["#000000", "#1e2500", "#718b00"] as const,
  start: { x: 0.2, y: 0.1 },
  end: { x: 0.9, y: 1 },
};

export const COACH_HERO = {
  colors: ["#000000", "#050600", "#2a3300", "#718b00"] as const,
  locations: [0, 0.5, 0.84, 1] as const,
};
