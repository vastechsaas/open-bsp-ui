import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";
import type { InstagramOrganizationAddressExtra } from "@/supabase/client";

type InstagramAccountResult = {
  address: string;
  organization_id: string;
  service: "instagram";
  status: string;
  extra: Omit<InstagramOrganizationAddressExtra, "access_token">;
};

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * Builds the Instagram Business Login authorize URL server-side (the client_id
 * and scopes live in the backend). `state` carries CSRF protection / the
 * onboarding token. The endpoint is public, so the anon key is enough — used by
 * both the in-app connect and the public onboarding-link flows.
 */
export async function getInstagramAuthorizeUrl(
  redirect_uri: string,
  state: string,
): Promise<string> {
  const url = new URL(`${FUNCTIONS_URL}/instagram-management/authorize-url`);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("state", state);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) throw new Error("Could not get Instagram authorize URL");

  const data = (await res.json()) as { url: string };
  return data.url;
}

export type InstagramSignupPayload = {
  code: string;
  redirect_uri: string;
  organization_id: string;
  user_id: string;
};

export function useInstagramSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InstagramSignupPayload) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (
        useBoundStore.getState().ui.activeOrgId !== payload.organization_id ||
        session?.user.id !== payload.user_id
      )
        throw new Error("Instagram connection context is no longer valid");

      const { data, error } =
        await supabase.functions.invoke<InstagramAccountResult>(
          "instagram-management/signup",
          {
            method: "POST",
            body: {
              organization_id: payload.organization_id,
              code: payload.code,
              redirect_uri: payload.redirect_uri,
            },
          },
        );

      if (error) throw error;
      if (!data) throw new Error("Instagram account response is missing");

      return data;
    },
    onSuccess: (_data, payload) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.addresses(payload.organization_id),
      }),
  });
}

export function useInstagramDisconnect() {
  const queryClient = useQueryClient();
  const organization_id = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (payload: { ig_user_id: string }) => {
      if (!organization_id) throw new Error("No active organization");

      const { data, error } =
        await supabase.functions.invoke<InstagramAccountResult>(
          "instagram-management/signup",
          {
            method: "DELETE",
            body: {
              organization_id,
              ...payload,
            },
          },
        );

      if (error) throw error;
      if (!data) throw new Error("Instagram account response is missing");

      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.addresses(organization_id),
      }),
  });
}
