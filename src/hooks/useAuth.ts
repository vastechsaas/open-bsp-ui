import { supabase } from "@/supabase/client";
import useBoundStore, { reset } from "@/stores/useBoundStore";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route } from "@/routes/__root";
import { useQueryClient } from "@tanstack/react-query";
import { resetAuthorizedCache } from "@/utils/IdbUtils";
import { isSignInPath } from "@/utils/SignInUtils";
import { useWorkspaceArrival } from "@/stores/workspaceArrival";

/**
 * Hook to manage authentication state
 * Syncs Supabase auth session with the app's global store
 * Redirects to login when user logs out
 */
export function useAuth() {
  const setUser = useBoundStore((state) => state.ui.setUser);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      // There is a SIGNED_IN event at tab focus. Checking if the user is
      // already logged in to avoid navigating to "/" or "/login".
      const loggedUser = useBoundStore.getState().ui.user;

      const user = session?.user ?? null;
      if (
        !loggedUser &&
        user &&
        event === "SIGNED_IN" &&
        isSignInPath(window.location.pathname)
      ) {
        useWorkspaceArrival.getState().begin();
      }
      setUser(user);

      // Signed in
      // The sign-in route revalidates its loader once the user is available.
      if (
        !loggedUser &&
        user &&
        event === "SIGNED_IN" &&
        !isSignInPath(window.location.pathname)
      ) {
        void navigate({
          href: redirect ?? "/",
        });
      }

      // Signed out
      if (loggedUser && !user) {
        useWorkspaceArrival.getState().finish();
        // Drop tenant data before navigating; never display an expiry toast.
        queryClient.clear();
        reset();
        void resetAuthorizedCache().catch(() => undefined);
        if (!isSignInPath(window.location.pathname)) {
          void navigate({
            to: "/login",
            replace: true,
            search: {
              redirect:
                window.location.pathname +
                window.location.search +
                window.location.hash,
            },
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, queryClient, redirect, setUser]);
}
