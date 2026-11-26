import { router, useNavigation } from "expo-router";

/**
 * Leaves the whole log flow (camera, Type, the meal review …) and returns to the screen it was
 * opened from, with that screen as it was (Home or Meals, the day shown). User decision 2026-11-27:
 * close goes back where logging started, not always to Home. The log screens live in their own
 * stack (`app/log/_layout.tsx`), so going back in the parent stack closes all of them at once.
 */
export function useLeaveLog(): () => void {
  const navigation = useNavigation();
  return () => {
    const root = navigation.getParent();
    if (root?.canGoBack()) root.goBack();
    else router.dismissTo("/today");
  };
}
