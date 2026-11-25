import { router } from "expo-router";
import { ListCard } from "@/components/ui";
import { LinkRow, Row } from "./rows";
import { longDate } from "@/lib/dates";
import type { PlanDto, ProfileDto } from "@fitr8/contracts";

const DIET_LABEL = { VEG: "Veg", NON_VEG: "Non-veg", EGGETARIAN: "Eggetarian", VEGAN: "Vegan" } as const;
const WHERE_LABEL = { FULL_GYM: "Gym", DUMBBELLS: "Home", BODYWEIGHT: "Anywhere" } as const;
const ACTIVITY_LABEL = {
  SEDENTARY: "Mostly sitting",
  LIGHT: "Lightly active",
  MODERATE: "Moderately active",
  VERY_ACTIVE: "Very active",
  ATHLETE: "Athlete",
} as const;

/** Design 13 "Body": height, the latest weigh-in, body fat and activity. */
export function BodyGroup({ profile, metric }: { profile: ProfileDto; metric: PlanDto["metric"] | undefined }) {
  return (
    <ListCard title="Body">
      <Row label="Height" value={`${profile.heightCm} cm`} />
      <Row
        label="Weight"
        value={metric ? `${metric.weightKg} kg` : "—"}
        sub={metric ? `on ${longDate(metric.date)}` : undefined}
      />
      <Row label="Body fat" value={metric?.bodyFatPct != null ? `${Math.round(metric.bodyFatPct * 10) / 10}%` : "—"} />
      <Row label="Activity" value={ACTIVITY_LABEL[profile.activityLevel]} />
    </ListCard>
  );
}

/** Design 13 "Food and training": diet, equipment, sessions and a link to edit them in onboarding. */
export function FoodTrainingGroup({ profile }: { profile: ProfileDto }) {
  return (
    <ListCard title="Food and training">
      <Row label="Diet" value={DIET_LABEL[profile.dietType]} />
      <Row label="Where I train" value={WHERE_LABEL[profile.equipment]} />
      <Row label="Sessions" value={`${profile.trainingDaysPerWeek} a week · ${profile.sessionMinutes} min`} />
      <LinkRow label="Edit body and training" onPress={() => router.push("/onboarding")} />
    </ListCard>
  );
}
