import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { BusinessHoursSettings } from "@/supabase/types/extra_types";
import { businessHoursPatch } from "@/utils/BusinessHoursUtils";
import { queryKeys } from "./queryKeys";

export function useSaveBusinessHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      settings,
    }: {
      organizationId: string;
      userId: string;
      settings: BusinessHoursSettings;
    }) => {
      const current = useBoundStore.getState().ui;
      if (
        current.user?.id !== userId ||
        current.activeOrgId !== organizationId
      ) {
        throw new Error("Organization or account changed");
      }
      // Existing tenant-scoped UPDATE policies authorize owners and admins.
      await supabase
        .from("organizations")
        .update(businessHoursPatch(settings))
        .eq("id", organizationId)
        .select("id")
        .single()
        .throwOnError();
    },
    onSuccess: async (_data, { organizationId, userId }) => {
      const current = useBoundStore.getState().ui;
      if (current.user?.id !== userId || current.activeOrgId !== organizationId)
        return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(organizationId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
    },
  });
}
