/** Names for the Continue hint ("Sex: Choose one"; "Enter your height" stands alone). Web has the same. */
const FIELD_LABELS: Record<string, string> = {
  name: "First name",
  lastName: "Last name",
  phone: "Phone",
  goalType: "Goal",
  targetWeightKg: "Target weight",
  targetBodyFatPct: "Target body fat",
  targetDate: "Target date",
  sex: "Sex",
  birthDate: "Date of birth",
  heightCm: "Height",
  weightKg: "Weight",
  waistCm: "Waist",
  neckCm: "Neck",
  hipCm: "Hip",
  activityLevel: "Activity",
  dietType: "Diet",
  equipment: "Where you train",
  medicalNote: "Medical note",
};

/** The line above Continue naming what still blocks the step, prefixed with its field unless the message says it. */
export function hintFor(key: string, message: string) {
  const label = FIELD_LABELS[key];
  if (!label || message.toLowerCase().includes(label.toLowerCase().split(" ").pop()!)) return message;
  return `${label}: ${message}`;
}
