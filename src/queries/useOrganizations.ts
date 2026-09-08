import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type OrganizationInsert,
  type OrganizationUpdate,
  supabase,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";

export function useOrganizations() {
  const userId = useBoundStore((state) => state.ui.user?.id);

  return useQuery({
    queryKey: queryKeys.organizations.all(),
    queryFn: async () =>
      await supabase
        .from("organizations")
        .select()
        .order("name")
        .throwOnError(),
    enabled: !!userId,
    select: (data) => data.data,
  });
}

export function useOrganization(id: string) {
  const userId = useBoundStore((state) => state.ui.user?.id);

  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: async () =>
      await supabase
        .from("organizations")
        .select()
        .eq("id", id)
        .single()
        .throwOnError(),
    enabled: !!userId && !!id,
    select: (data) => data.data,
  });
}

export function useCurrentOrganization() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useOrganization(orgId || "");
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrganizationInsert) => {
      // Note: because of RLS and the fact that the member(ship) that relates the user who created the organization
      // and the organization is added by an after insert trigger, insert+select does not work.
      const id = crypto.randomUUID();

      await supabase
        .from("organizations")
        .insert({ ...data, id })
        .throwOnError();

      const { data: org } = await supabase
        .from("organizations")
        .select()
        .eq("id", id)
        .single()
        .throwOnError();

      return org;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
      queryClient.setQueryData(
        queryKeys.organizations.detail(data.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => (old ? { ...old, data } : { data, error: null }),
      );
    },
  });
}

export function useUpdateCurrentOrganization() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (data: OrganizationUpdate) => {
      if (!orgId) throw new Error("No active organization");

      const { data: org } = await supabase
        .from("organizations")
        .update(data)
        .eq("id", orgId)
        .select()
        .single()
        .throwOnError();

      return org;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
      queryClient.setQueryData(
        queryKeys.organizations.detail(data.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => (old ? { ...old, data } : old),
      );
    },
  });
}

export function useArchiveCurrentOrganization() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      expectedName,
      reason,
    }: {
      expectedName: string;
      reason: string;
    }) => {
      if (!orgId) throw new Error("No active organization");

      await supabase
        .rpc("archive_organization", {
          p_expected_name: expectedName,
          p_organization_id: orgId,
          p_reason: reason,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
    },
  });
}

export function useArchivedOrganizations() {
  const userId = useBoundStore((state) => state.ui.user?.id);

  return useQuery({
    queryKey: queryKeys.organizations.archived(),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_my_archived_organizations_page", {
          p_page: 1,
          p_page_size: 50,
        })
        .throwOnError();
      return result.data;
    },
    enabled: !!userId,
  });
}

export function useRestoreOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const result = await supabase
        .rpc("restore_organization", {
          p_organization_id: id,
          p_reason: reason,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.archived(),
      });
    },
  });
}
