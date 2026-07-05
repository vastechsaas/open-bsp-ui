import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type OrganizationAddressRow } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";

function useProfileCache() {
  const queryClient = useQueryClient();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  const updateCache = (
    organizationAddress: string,
    data: OrganizationAddressRow,
  ) => {
    queryClient.setQueryData(
      queryKeys.organizations.addressDetail(
        organizationId,
        organizationAddress,
      ),
      // The organization-address query stores the Supabase response envelope.
      (old: unknown) =>
        old && typeof old === "object"
          ? { ...old, data, error: null }
          : { data, error: null },
    );
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizations.addresses(organizationId),
    });
  };

  const refreshCache = (organizationAddress: string) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizations.addressDetail(
        organizationId,
        organizationAddress,
      ),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizations.addresses(organizationId),
    });
  };

  return { organizationId, refreshCache, updateCache };
}

export function useWhatsAppProfileSync() {
  const { organizationId, refreshCache, updateCache } = useProfileCache();

  return useMutation({
    mutationFn: async (organizationAddress: string) => {
      if (!organizationId) throw new Error("No active organization");

      // Supabase types the function error payload as `any`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } =
        await supabase.functions.invoke<OrganizationAddressRow>(
          "whatsapp-management/profile/sync",
          {
            method: "POST",
            body: {
              organization_id: organizationId,
              organization_address: organizationAddress,
            },
          },
        );

      if (error) throw error;
      return data as OrganizationAddressRow;
    },
    onSuccess: (data, organizationAddress) => {
      updateCache(organizationAddress, data);
    },
    onError: (_, organizationAddress) => {
      refreshCache(organizationAddress);
    },
  });
}

export type WhatsAppProfileUpdate = {
  organizationAddress: string;
  vertical: string;
  description: string;
  address: string;
  about: string;
  email: string;
  websites: string[];
  file?: File;
};

export function useWhatsAppProfileUpdate() {
  const { organizationId, refreshCache, updateCache } = useProfileCache();

  return useMutation({
    mutationFn: async ({
      organizationAddress,
      file,
      ...profile
    }: WhatsAppProfileUpdate) => {
      if (!organizationId) throw new Error("No active organization");

      const form = new FormData();
      form.set("organization_id", organizationId);
      form.set("organization_address", organizationAddress);
      form.set("vertical", profile.vertical);
      form.set("description", profile.description);
      form.set("address", profile.address);
      form.set("about", profile.about);
      form.set("email", profile.email);
      form.set("websites", JSON.stringify(profile.websites));
      if (file) form.set("file", file);

      // Supabase types the function error payload as `any`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } =
        await supabase.functions.invoke<OrganizationAddressRow>(
          "whatsapp-management/profile",
          {
            method: "PATCH",
            body: form,
          },
        );

      if (error) throw error;
      return data as OrganizationAddressRow;
    },
    onSuccess: (data, variables) => {
      updateCache(variables.organizationAddress, data);
    },
    onError: (_, variables) => {
      refreshCache(variables.organizationAddress);
    },
  });
}
