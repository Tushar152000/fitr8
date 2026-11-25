import type { MeasurementAddInput, MeasurementKey } from "@fitr8/contracts";
import { localYmd } from "./meal-param";

/** The measurements a person types in (body fat is calculated by the server). */
export type EnteredKey = keyof MeasurementAddInput;

/**
 * The add form's fields, in form order, with the API bounds (contracts MeasurementAddSchema /
 * domain MEASUREMENT_BOUNDS) so mistakes are caught before the request.
 */
export const MEASURE_FIELDS: { key: EnteredKey; label: string; unit: string; min: number; max: number }[] = [
  { key: "weightKg", label: "Weight", unit: "kg", min: 30, max: 250 },
  { key: "waistCm", label: "Waist", unit: "cm", min: 40, max: 200 },
  { key: "neckCm", label: "Neck", unit: "cm", min: 20, max: 70 },
  { key: "chestCm", label: "Chest", unit: "cm", min: 50, max: 200 },
  { key: "hipCm", label: "Hips", unit: "cm", min: 50, max: 200 },
  { key: "armCm", label: "Arms", unit: "cm", min: 15, max: 70 },
];

/** Row titles and units on the Measurements screen, in screen order (contracts MEASUREMENT_KEYS). */
export const MEASURE_ROWS: Record<MeasurementKey, { label: string; unit: string }> = {
  weightKg: { label: "Weight", unit: "kg" },
  bodyFatPct: { label: "Body fat", unit: "%" },
  waistCm: { label: "Waist", unit: "cm" },
  chestCm: { label: "Chest", unit: "cm" },
  hipCm: { label: "Hips", unit: "cm" },
  armCm: { label: "Arms", unit: "cm" },
  neckCm: { label: "Neck", unit: "cm" },
};

/** "75.0 kg" (weight always one decimal), "22 %", "86 cm", "86.5 cm". */
export function formatMeasure(key: MeasurementKey, value: number): string {
  const { unit } = MEASURE_ROWS[key];
  const n = key === "weightKg" ? value.toFixed(1) : String(Math.round(value * 10) / 10);
  return `${n} ${unit}`;
}

/**
 * "Updated today", "Updated yesterday", "Updated 2 days ago", "Updated 1 week ago", "Updated 3
 * months ago": whole calendar days between the measurement's day and today on this phone.
 */
export function updatedLabel(date: string, today = localYmd()): string {
  const days = Math.max(
    0,
    Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000),
  );
  const ago = (n: number, unit: string) => `Updated ${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return ago(days, "day");
  if (days < 30) return ago(Math.floor(days / 7), "week");
  if (days < 365) return ago(Math.floor(days / 30), "month");
  return ago(Math.floor(days / 365), "year");
}

export type MeasureDraft = Record<EnteredKey, string>;
export const EMPTY_DRAFT: MeasureDraft = { weightKg: "", waistCm: "", neckCm: "", chestCm: "", hipCm: "", armCm: "" };

/**
 * The form's strings → the POST body, or the errors to show (per field, plus `form` when nothing
 * was entered).
 */
export function readDraft(
  draft: MeasureDraft,
): { ok: true; body: MeasurementAddInput } | { ok: false; errors: Partial<Record<EnteredKey | "form", string>> } {
  const body: MeasurementAddInput = {};
  const errors: Partial<Record<EnteredKey | "form", string>> = {};
  for (const f of MEASURE_FIELDS) {
    const raw = draft[f.key].trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[f.key] = "Enter a number";
    else if (n < f.min || n > f.max) errors[f.key] = `Between ${f.min} and ${f.max} ${f.unit}`;
    else body[f.key] = Math.round(n * 10) / 10;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  if (!Object.keys(body).length) return { ok: false, errors: { form: "Add at least one measurement" } };
  return { ok: true, body };
}
