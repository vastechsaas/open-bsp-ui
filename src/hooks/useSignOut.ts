import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  clearSupabaseAuthStorage,
  isMissingServerSession,
} from "@/utils/AuthSessionUtils";
import { resetAuthorizedCache } from "@/utils/IdbUtils";

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useBoundStore((state) => state.ui.setUser);
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const setActiveConv = useBoundStore((state) => state.ui.setActiveConv);

  return useCallback(async () => {
    let globalError: unknown;

    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      globalError = error;
    } catch (error) {
      globalError = error;
    }

    if (globalError) {
      try {
        clearSupabaseAuthStorage(
          window.localStorage,
          import.meta.env.VITE_SUPABASE_URL!,
        );
      } catch {
        // The explicit application-state cleanup below must still complete.
      }

      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Local state is cleared explicitly below even if the auth client fails.
      }

      if (!isMissingServerSession(globalError)) {
        console.warn("Remote sign-out failed; local session was cleared");
      }
    }

    await resetAuthorizedCache().catch(() => undefined);
    queryClient.clear();
    setActiveConv(null);
    setActiveOrg(null);
    setUser(null);

    if (!window.location.pathname.startsWith("/login")) {
      await navigate({
        to: "/login",
        search: {
          redirect: window.location.pathname + window.location.hash,
        },
      });
    }
  }, [navigate, queryClient, setActiveConv, setActiveOrg, setUser]);
}
