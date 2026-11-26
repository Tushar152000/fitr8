import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { fonts, useColors } from "@/lib/theme";

/**
 * `display`…`button` are the original scale. The rest are the Figma "Fitr8" type styles (Inter,
 * line height "normal" unless Figma sets one): stat = Display/Stat, title = Display/Title,
 * heading1-3 = Heading/H1-H3, bodySm/bodyMedium/bodyStrong = Body/*, labelRegular/labelMedium/
 * labelStrong = Label/*, caption/captionStrong = Caption/*, nav = Nav/Label.
 */
type Variant =
  | "display"
  | "h1"
  | "h2"
  | "body"
  | "meta"
  | "label"
  | "button"
  | "stat"
  | "title"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bodySm"
  | "bodyMedium"
  | "bodyStrong"
  | "labelRegular"
  | "labelMedium"
  | "labelStrong"
  | "caption"
  | "captionStrong"
  | "nav";

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display700, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.display700, fontSize: 28, lineHeight: 33, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.display700, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: fonts.sans400, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  meta: { fontFamily: fonts.sans600, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  label: { fontFamily: fonts.sans600, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  button: { fontFamily: fonts.sans600, fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  stat: { fontFamily: fonts.sans700, fontSize: 24, letterSpacing: -0.48 },
  title: { fontFamily: fonts.sans600, fontSize: 24 },
  heading1: { fontFamily: fonts.sans600, fontSize: 22 },
  heading2: { fontFamily: fonts.sans600, fontSize: 18 },
  heading3: { fontFamily: fonts.sans600, fontSize: 16 },
  bodySm: { fontFamily: fonts.sans400, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: fonts.sans500, fontSize: 14 },
  bodyStrong: { fontFamily: fonts.sans600, fontSize: 14 },
  labelRegular: { fontFamily: fonts.sans400, fontSize: 12 },
  labelMedium: { fontFamily: fonts.sans500, fontSize: 12 },
  labelStrong: { fontFamily: fonts.sans600, fontSize: 12 },
  caption: { fontFamily: fonts.sans400, fontSize: 11, lineHeight: 16 },
  captionStrong: { fontFamily: fonts.sans600, fontSize: 11 },
  nav: { fontFamily: fonts.sans600, fontSize: 11.5, letterSpacing: -0.23 },
};

/** Figma styles whose default colour is text/secondary. */
const SECONDARY: ReadonlySet<Variant> = new Set(["labelRegular", "labelMedium", "caption"]);

const WEIGHTS = {
  400: fonts.sans400,
  500: fonts.sans500,
  600: fonts.sans600,
  700: fonts.sans700,
} as const;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  /** Font weight; ignored for display/h1/h2. */
  weight?: keyof typeof WEIGHTS;
  size?: number;
  color?: string;
  /** Tabular numbers, for anything that shows figures. */
  tabular?: boolean;
  center?: boolean;
}

/** All text in the app goes through this, so fonts and colours stay on the design tokens. */
export function Text({ variant = "body", weight, size, color, tabular, center, style, ...props }: AppTextProps) {
  const c = useColors();
  const base = VARIANTS[variant];
  const defaultColor = variant === "meta" ? c.ink3 : variant === "label" || SECONDARY.has(variant) ? c.ink2 : c.ink;
  const display = variant === "display" || variant === "h1" || variant === "h2";
  return (
    <RNText
      {...props}
      style={[
        { color: defaultColor },
        base,
        weight && !display ? { fontFamily: WEIGHTS[weight] } : null,
        size
          ? { fontSize: size, lineHeight: base.lineHeight ? Math.round(size * (display ? 1.15 : 1.4)) : undefined }
          : null,
        color ? { color } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        center ? { textAlign: "center" } : null,
        style,
      ]}
    />
  );
}
