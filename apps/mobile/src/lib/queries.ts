import type {
  BillingDto,
  HealthStatusDto,
  HealthSummaryDto,
  TrainingStateDto,
  TrainingWeekDto,
  CoachMemoryView,
  ProgressDto,
  ReminderListDto,
  SavedMealsDto,
  UsageDto,
} from "@fitr8/contracts";
import { api } from "./api";
import type { Day, Energy, TodayWorkout, WaterDay } from "./types";
import type { PlanResponse } from "./types-plan";

/** Shared query definitions, so screens that show the same data share one cache entry. */
export const dayQuery = { queryKey: ["day"], queryFn: () => api<Day>("/api/dashboard") };
/** One day on Today: null = today (shares `dayQuery`'s cache), else a recent past day. */
export const dayQueryFor = (date: string | null) =>
  date ? { queryKey: ["day", date], queryFn: () => api<Day>(`/api/dashboard?date=${date}`) } : dayQuery;

export const workoutQuery = (energy: Energy = "ok") => ({
  queryKey: ["workout", energy],
  queryFn: () => api<TodayWorkout>(`/api/workouts/today?energy=${energy}`),
});

/** GET /api/progress: Today's Progress card and the Progress screen (same key, one fetch). */
export const progressQuery = { queryKey: ["progress"], queryFn: () => api<ProgressDto>("/api/progress") };
export const waterQuery = { queryKey: ["water"], queryFn: () => api<WaterDay>("/api/water") };

/** GET /api/plan: profile, goal, targets and the plan summary (Profile, onboarding, welcome back). */
export const planQuery = { queryKey: ["plan"], queryFn: () => api<PlanResponse>("/api/plan") };

/** GET /api/billing: plan, renewal and today's limits (FITR8 Pro). */
export const billingQuery = { queryKey: ["billing"], queryFn: () => api<BillingDto>("/api/billing") };

/** GET /api/saved-meals: the user's own repeat meals (builder, one-tap log). */
export const savedMealsQuery = {
  queryKey: ["saved-meals"],
  queryFn: () => api<SavedMealsDto>("/api/saved-meals").then((r) => r.savedMeals),
};

/** GET /api/reminders: the user's reminders; the phone schedules them locally. */
export const remindersQuery = {
  queryKey: ["reminders"],
  queryFn: () => api<ReminderListDto>("/api/reminders"),
};

/** What the coach remembers about the user (GET /api/coach/memories). */
export const coachMemoriesQuery = {
  queryKey: ["coach", "memories"],
  queryFn: () => api<CoachMemoryView[]>("/api/coach/memories"),
};

/** GET /api/usage: photo scans used and left today. */
export const usageQuery = { queryKey: ["usage"], queryFn: () => api<UsageDto>("/api/usage") };

/** GET /api/training: training profile and setup defaults (Premium). */
export const trainingStateQuery = {
  queryKey: ["training", "state"],
  queryFn: () => api<TrainingStateDto>("/api/training"),
};

/** GET /api/training/week: the week containing `start` (null = this week). */
export const trainingWeekQuery = (start: string | null = null) => ({
  queryKey: ["training", "week", start ?? "current"],
  queryFn: () => api<TrainingWeekDto>(start ? `/api/training/week?start=${start}` : "/api/training/week"),
});

/** GET /api/health-data: connected health apps (Apple Health / Health Connect). */
export const healthStatusQuery = {
  queryKey: ["health", "status"],
  queryFn: () => api<HealthStatusDto>("/api/health-data"),
};

/** GET /api/health-data/summary: steps, heart rate, BMI, SpO2, sleep and recovery today. */
export const healthSummaryQuery = {
  queryKey: ["health", "summary"],
  queryFn: () => api<HealthSummaryDto>("/api/health-data/summary"),
};
