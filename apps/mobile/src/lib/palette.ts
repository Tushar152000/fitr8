/**
 * FITR8 colour system v2 (2026-11-25, "Fitr8 / Color" semantic tokens): neutral canvas, near-black
 * inverse surfaces, olive accent (#718B00) with a lime highlight (#C2E04A), blue for links/info and
 * aqua for hydration. Each key below names the design token it aliases.
 *
 * Two palettes with the same keys. Components read the active one with `useColors()` (or build
 * styles with `makeStyles`), never by importing a palette directly, so the whole app follows the
 * phone's appearance or the user's choice in Profile (lib/appearance.tsx).
 *
 * The design system defines light only; dark is derived: true-black ground, surfaces lifted by
 * lightness, off-white text at the same alpha steps, and accent TEXT in lime (olive is too dark to
 * read on black). Macro and workout-day colours are data colours the system doesn't cover yet.
 */
const light = {
  ground: "#f4f3f9",
  surface: "#ffffff",
  sunken: "#ecebf1",
  /** Raised control on a chip/track (selected segment): white in light, lifted grey in dark. */
  raised: "#ffffff",
  track: "#ececec",
  line: "rgba(0,0,0,0.06)",
  lineStrong: "rgba(0,0,0,0.2)",
  ink: "#0e0e0e",
  ink2: "rgba(14,14,14,0.55)",
  ink3: "rgba(14,14,14,0.4)",
  brand: "#718b00",
  brandHover: "#5c7200",
  brandGlow: "#c2e04a",
  /** Brand-coloured text and icons on ground/surface (links, selected states). */
  brandText: "#718b00",
  /** Tinted brand background (selected chips, highlights). */
  brandSoft: "rgba(113,139,0,0.12)",
  /** Border of Premium cards and banners. */
  premiumLine: "rgba(113,139,0,0.35)",
  protein: "#2f6b4f",
  proteinSoft: "#ddebe3",
  carbs: "#e3a13b",
  carbsText: "#9a6212",
  fat: "#c0396b",
  caution: "#e8a15c",
  cautionSoft: "#fdebd3",
  cautionText: "#8a3c08",
  danger: "#c0392b",
  dangerHover: "#a33024",
  /** Text on a `danger` fill. */
  onDanger: "#ffffff",
  water: "#2f97c1", // water card and bar; text-safe on ground and surface
  waterSoft: "#e3f4fa",
  chip: "#ececec",
  dash: "rgba(0,0,0,0.2)",
  /** The dark feature card ("dark card" in the design) and dark screens. White text on it. */
  panel: "#0c0c0c",
  /** Hairline around `panel` (invisible in light, separates it from the ground in dark). */
  panelLine: "rgba(255,255,255,0)",
  /** Strong button: the highest-contrast fill against the ground, and its text. */
  strong: "#0c0c0c",
  strongHover: "#262626",
  onStrong: "#ffffff",
  /** Behind bottom sheets and dialogs. */
  scrim: "rgba(0,0,0,0.5)",
  /** Workout day types (always shown with a text label too, never colour alone). Text-safe on surface. */
  dayGym: "#6a3fd8",
  dayGymSoft: "#efe8fd",
  dayRun: "#1f6fb8",
  dayRunSoft: "#e1eefa",
  dayYoga: "#1d7a45",
  dayYogaSoft: "#dcf3e4",
  dayWalk: "#8a5a0c",
  dayWalkSoft: "#fbefd6",
  dayRest: "#6b6d7a",
  dayRestSoft: "#ececf2",
  /** Home v2 accent (olive): links on Home cards and the camera button's glow. Text-safe on surface. */
  accentText: "#718b00",
  accent: "#718b00",
  /** accent/highlight (lime): icon highlights, selected marks on dark. Not for text on light. */
  highlight: "#c2e04a",
  /** text/link and data/info (blue). */
  link: "#0077ff",
  /** data/hydration-1..3 (aqua, dark → light). */
  hydration1: "#2f97c1",
  hydration2: "#35cefe",
  hydration3: "#a6dded",
  /** bg/glass, bg/glass-strong: translucent fills on inverse (dark) surfaces. */
  glass: "rgba(255,255,255,0.08)",
  glassStrong: "rgba(255,255,255,0.12)",
  /** text/on-inverse-secondary. */
  onInverse2: "rgba(255,255,255,0.6)",
  /** Home calorie card (Figma "Home"): macro bars and the ring's track. Data colours, text-unsafe. */
  macroProtein: "#faad3b",
  macroCarbs: "#00dbc6",
  macroFat: "#cb2fff",
  ringTrack: "#f0f0f0",
  /** Always white: text/icons on brand, panel, photos and the camera. */
  white: "#ffffff",
} as const;

export type Colors = { readonly [K in keyof typeof light]: string };
export type ColorScheme = "light" | "dark";

const dark: Colors = {
  ground: "#000000",
  surface: "#121212",
  sunken: "#1c1c1c",
  raised: "#2a2a2a",
  track: "#262626",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.2)",
  ink: "#f4f3f9",
  ink2: "rgba(244,243,249,0.62)",
  ink3: "rgba(244,243,249,0.45)",
  brand: "#718b00",
  brandHover: "#84a200",
  brandGlow: "#c2e04a",
  brandText: "#c2e04a",
  brandSoft: "rgba(194,224,74,0.14)",
  premiumLine: "rgba(194,224,74,0.3)",
  protein: "#5fc490",
  proteinSoft: "#0e2417",
  carbs: "#e8ad52",
  carbsText: "#f0bd6a",
  fat: "#ec7aa2",
  caution: "#eba765",
  cautionSoft: "#2a1d0f",
  cautionText: "#f5be86",
  danger: "#f07a6d",
  dangerHover: "#e0675a",
  onDanger: "#151724",
  water: "#35cefe",
  waterSoft: "rgba(53,206,254,0.14)",
  chip: "#1f1f1f",
  dash: "rgba(255,255,255,0.2)",
  panel: "#161616",
  panelLine: "rgba(255,255,255,0.08)",
  strong: "#f4f3f9",
  strongHover: "#dadada",
  onStrong: "#0e0e0e",
  scrim: "rgba(0,0,0,0.6)",
  dayGym: "#b9a3ff",
  dayGymSoft: "#221b38",
  dayRun: "#6aa9f0",
  dayRunSoft: "#172b45",
  dayYoga: "#4ade80",
  dayYogaSoft: "#10291b",
  dayWalk: "#f0b454",
  dayWalkSoft: "#2e2410",
  dayRest: "#aba6b5",
  dayRestSoft: "#1d1a24",
  accentText: "#c2e04a",
  accent: "#718b00",
  highlight: "#c2e04a",
  link: "#4da3ff",
  hydration1: "#2f97c1",
  hydration2: "#35cefe",
  hydration3: "#a6dded",
  glass: "rgba(255,255,255,0.08)",
  glassStrong: "rgba(255,255,255,0.12)",
  onInverse2: "rgba(255,255,255,0.6)",
  macroProtein: "#ffb950",
  macroCarbs: "#2ee6d3",
  macroFat: "#d867ff",
  ringTrack: "#262626",
  white: "#ffffff",
};

export const palettes: Record<ColorScheme, Colors> = { light, dark };

/**
 * A token at a lower opacity: `fade(c.ink3, 0.6)`. Works for "#rrggbb" and "rgba(...)" tokens alike
 * (several tokens are alpha colours), so never append hex alpha digits to a token string.
 */
export function fade(color: string, alpha: number): string {
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (rgba) {
    const [r, g, b, a = "1"] = rgba[1]!.split(",").map((x) => x.trim());
    return `rgba(${r},${g},${b},${+(Number(a) * alpha).toFixed(3)})`;
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return color;
  const n = parseInt(hex[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const radius = { input: 14, button: 16, card: 20, sheet: 28 } as const;

/** Screen gutter: 16 on app screens (compact, 2026-11-24), 24 on onboarding. */
export const gutter = 16;

/**
 * Custom fonts need one family per weight on native. The app is set in Inter (Figma "Fitr8" type
 * styles, 2026-11-26); `display*` and `sans*` both map to it so older call sites keep working.
 * Bricolage Grotesque remains only for the FITR8 wordmark (`brand700`, components/ui/logo.tsx).
 */
export const fonts = {
  display500: "Inter_500Medium",
  display600: "Inter_600SemiBold",
  display700: "Inter_700Bold",
  display800: "Inter_800ExtraBold",
  sans400: "Inter_400Regular",
  sans500: "Inter_500Medium",
  sans600: "Inter_600SemiBold",
  sans700: "Inter_700Bold",
  brand700: "BricolageGrotesque_700Bold",
} as const;

/**
 * Flat design: the camera button is the only strong shadow; `seg` lifts the selected segment and
 * `card` is Figma "Elevation/Card" (0 20 20 #37440005), the faint lift under white cards and round
 * header buttons.
 */
export type Shadows = {
  readonly fab: { boxShadow: string };
  readonly seg: { boxShadow: string };
  readonly card: { boxShadow: string };
};
const shadowSets: Record<ColorScheme, Shadows> = {
  light: {
    fab: { boxShadow: "0 8px 18px rgba(20, 24, 0, 0.32)" },
    seg: { boxShadow: "0 1px 2px rgba(14, 14, 14, 0.12)" },
    card: { boxShadow: "0 20px 20px rgba(55, 68, 0, 0.02)" },
  },
  dark: {
    // Shadows barely read on dark; a soft lime glow keeps the FAB lifted.
    fab: { boxShadow: "0 6px 18px rgba(194, 224, 74, 0.18)" },
    seg: { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.5)" },
    card: { boxShadow: "0 0 0 rgba(0, 0, 0, 0)" },
  },
};
export const shadowsFor = (scheme: ColorScheme): Shadows => shadowSets[scheme];

/**
 * Text cursor and selection in every input: the brand olive (the same in both themes), never the
 * platform blue (user decision 2026-11-27). Spread onto a TextInput: `<TextInput {...INPUT_CARET} />`.
 */
export const INPUT_CARET = { cursorColor: "#718b00", selectionColor: "rgba(113,139,0,0.45)" } as const;
