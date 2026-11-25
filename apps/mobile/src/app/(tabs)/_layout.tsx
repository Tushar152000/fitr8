import { useQuery } from "@tanstack/react-query";
import { router, Tabs, type Href } from "expo-router";
import { useEffect } from "react";
import { ReminderPrompt } from "@/components/reminders/reminder-prompt";
import { TabBar } from "@/components/tab-bar";
import { useHealthSync } from "@/lib/health/use-health-sync";
import type { MealTypeValue } from "@fitr8/contracts";
import { localYmd } from "@/lib/meal-param";
import { loggedToday } from "@/lib/meal-reminder-plan";
import { dayQuery, remindersQuery } from "@/lib/queries";
import { useMe } from "@/lib/auth";
import { listenForNotificationLinks, syncCustomReminders, syncRoutineReminders } from "@/lib/reminders";
import { tabMotion } from "@/lib/motion";

/**
 * Home (today), Meals, Workout, [coach] and the [camera] (tab-bar.tsx; coach and camera open stacks).
 * Profile is a root stack screen (app/profile.tsx), pushed from Home's avatar.
 */
export default function TabsLayout() {
  useReminderSync();
  useHealthSync();
  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, ...tabMotion }}>
        <Tabs.Screen name="today" />
        <Tabs.Screen name="meals" />
        <Tabs.Screen name="workout" />
      </Tabs>
      {/* Once per install: offer reminders, then the system notification prompt. */}
      <ReminderPrompt />
    </>
  );
}

/**
 * Keeps the phone's scheduled reminders in step with the saved ones: at launch (a new phone, a
 * reinstall, a change made on another device) and whenever the Reminders screen changes the list.
 */
function useReminderSync() {
  const { data } = useQuery({ ...remindersQuery, staleTime: 5 * 60_000 });
  useEffect(() => {
    if (data) syncCustomReminders(data.reminders).catch(() => {});
  }, [data]);
  // The built-in meal and weekly weigh-in reminders, from the profile's switches. Today's dashboard
  // (shared with Home; every meal save refreshes it, and it refetches on foreground) drops today's
  // reminder for a meal already logged.
  const profile = useMe().profile;
  const meals = profile?.remindMeals ?? false;
  const weighIn = profile?.remindWeighIn ?? false;
  const { data: day } = useQuery({ ...dayQuery, enabled: meals });
  const logged = loggedToday(day, localYmd()).join(",");
  useEffect(() => {
    const loggedTypes = logged ? (logged.split(",") as MealTypeValue[]) : [];
    syncRoutineReminders({ meals, weighIn, loggedToday: loggedTypes }).catch(() => {});
  }, [meals, weighIn, logged, day?.date]);
  // A tapped reminder opens its screen (e.g. the weekly weigh-in → Measurements, weight field).
  useEffect(() => listenForNotificationLinks((url) => router.push(url as Href)), []);
}
