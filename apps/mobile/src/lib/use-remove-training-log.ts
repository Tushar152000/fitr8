import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { handlePremiumError } from "@/lib/premium";
import { queryClient } from "@/lib/query";
import { showToast } from "@/lib/toast";

/** Removes one logged training session and refreshes the week; a failure shows a toast. */
export function useRemoveTrainingLog() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api(`/api/training/logs/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["training"] });
    },
    onError: (e) => {
      if (!handlePremiumError(e)) showToast("Couldn't remove it. Try again.");
    },
  });
}
