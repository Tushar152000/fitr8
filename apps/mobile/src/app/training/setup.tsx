import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { BackHeader } from "@/components/back-header";
import { QueryError } from "@/components/query-error";
import { WorkoutSkeleton } from "@/components/skeletons";
import { Screen } from "@/components/ui";
import { TrainingSetup } from "@/components/workout/setup";
import { trainingStateQuery } from "@/lib/queries";
import { showToast } from "@/lib/toast";

/** 16b again, from the week's settings button: change how, how often and how long, then rebuild. */
export default function EditTrainingScreen() {
  const state = useQuery(trainingStateQuery);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/workout"));
  if (state.isPending || state.isError)
    return (
      <Screen>
        <BackHeader />
        {state.isError ? <QueryError error={state.error} onRetry={() => state.refetch()} /> : <WorkoutSkeleton />}
      </Screen>
    );
  return (
    <TrainingSetup
      state={state.data}
      onBack={back}
      onDone={() => {
        showToast("Your week is rebuilt");
        back();
      }}
    />
  );
}
