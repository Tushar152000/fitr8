import { palettes } from "@/lib/theme";

/** The camera stays dark in both schemes, so its colours are fixed (the light palette's). */
export const cam = palettes.light;

/** Figma "Snap your meal": glass buttons (white 10 %) and muted labels (white 60 % / 55 %). */
export const CAM_GLASS = "rgba(255,255,255,0.1)";
export const CAM_MUTED = cam.onInverse2;
export const CAM_SUBTLE = "rgba(255,255,255,0.55)";
