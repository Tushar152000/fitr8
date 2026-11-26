import { PLATFORM_HEALTH_APP } from "@/components/health/status";
import { Bell, Camera, Dumbbell, MessageCircle, ScanBarcode, ScanText, type LucideIcon } from "lucide-react-native";

export type PaywallFeature = {
  key: string;
  icon: LucideIcon;
  title: string;
  line: string;
  detail: string;
  example: string;
};

/** A cell of the Free vs Premium table: `true` included, `false` not (a muted dash), a string = the amount. */
export type TierValue = boolean | string;

export type Tier = { label: string; free: TierValue; premium: TierValue };

/** "What you get": one row open at a time, the first open by default. */
export const FEATURES: PaywallFeature[] = [
  {
    key: "photo",
    icon: Camera,
    title: "AI photo scanning",
    line: "Snap a meal, get calories and macros",
    detail: "Up to 10 photos a day. Works on mixed thalis, and you can fix any portion with one tap.",
    example: "Thali photo → 4 items, 780 kcal",
  },
  {
    key: "barcode",
    icon: ScanBarcode,
    title: "Barcode scanning",
    line: "Exact label nutrition for packed food",
    detail: "Scan biscuits, curd, protein bars or namkeen. Change the serving to half a pack or 3 biscuits.",
    example: "Curd 400 g → 64 kcal per 100 g",
  },
  {
    key: "label",
    icon: ScanText,
    title: "Nutrition label reading",
    line: "No barcode? Photograph the label",
    detail: "fitr8 reads the nutrition table on the pack and fills in exact values for you to check.",
    example: "Label photo → protein, carbs, fat",
  },
  {
    key: "coach",
    icon: MessageCircle,
    title: "AI Coach",
    line: "Nutrition and training advice",
    detail: "Ask what to eat for dinner or how to adjust today's workout. Answers use your log and your goal.",
    example: "“520 kcal left, what should I eat?”",
  },
  {
    key: "workouts",
    icon: Dumbbell,
    title: "Your AI workout coach",
    line: "A weekly plan for gym, running or yoga",
    detail:
      "Built around your calories and goal, adjusted to what you eat and how you slept. Log sets in seconds and see what each day burns.",
    example: "Mon upper body · Tue easy run · Wed yoga",
  },
  {
    key: "reminders",
    icon: Bell,
    title: "Unlimited reminders",
    line: "Meals, water and workouts",
    detail: "Set as many reminders as you like, at the times that suit your day. Free includes 3.",
    example: "Water every 2 hours, 8 am to 8 pm",
  },
];

/** Free vs Premium, row by row. */
export const TIERS: Tier[] = [
  { label: "Type meals", free: true, premium: true },
  { label: "Calorie and protein targets", free: true, premium: true },
  { label: "Water and weight tracking", free: true, premium: true },
  { label: "AI photo scanning", free: false, premium: "10 a day" },
  { label: "Barcode scanning", free: false, premium: true },
  { label: "Nutrition label reading", free: false, premium: true },
  { label: "AI Coach", free: false, premium: true },
  { label: "Weekly workout plan", free: false, premium: true },
  { label: PLATFORM_HEALTH_APP, free: true, premium: true },
  { label: "Reminders", free: "3", premium: "Unlimited" },
];
