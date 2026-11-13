import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useInitialDataFetch } from "@/hooks/useInitalDataFetch";
import useBoundStore from "@/stores/useBoundStore";
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/supabase/client";
import { useSetActiveOrg } from "@/hooks/useSetActiveOrg";
import { resolveAuthenticatedHome } from "@/queries/usePlatformAdmin";
import { isPlatformPath } from "@/utils/PlatformAdminUtils";
import { isSignInPath, safeSignInRedirect } from "@/utils/SignInUtils";

function TenantRuntime() {
  useSetActiveOrg();
  useRealtimeSubscription();
  useInitialDataFetch();
  return null;
}

function RootLayout() {
  useAuth();
  const location = useLocation();
  const signedIn = useBoundStore((state) => !!state.ui.user);

  return (
    <>
      {signedIn &&
        !isSignInPath(location.pathname) &&
        !isPlatformPath(location.pathname) &&
        !location.pathname.startsWith("/onboard/set-password") && (
          <TenantRuntime />
        )}
      <Outlet />
    </>
  );
}

const ALWAYS_PUBLIC_PATH_PREFIXES = [
  "/onboard",
  "/privacy",
  "/terms",
  "/data-deletion",
];

export const Route = createRootRoute({
  validateSearch: (search): { redirect?: string } => ({
    redirect: safeSignInRedirect(search.redirect),
  }),
  beforeLoad: async ({ search, location }) => {
    const isAlwaysPublicPath = ALWAYS_PUBLIC_PATH_PREFIXES.some((path) =>
      location.pathname.startsWith(path),
    );
    const isLandingPage = location.pathname === "/";
    const isSignIn = isSignInPath(location.pathname);

    if (isAlwaysPublicPath) return;

    let user = useBoundStore.getState().ui.user;

    if (!user) {
      const { data } = await supabase.auth.getSession();
      user = data?.session?.user ?? null;
    }

    if (user && isSignIn) {
      throw redirect({
        href: search.redirect ?? (await resolveAuthenticatedHome()),
        replace: true,
      });
    }

    if (user && isLandingPage) {
      throw redirect({
        to: await resolveAuthenticatedHome(),
      });
    }

    if (!user && isLandingPage) return;

    if (!user && !isSignIn) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: RootLayout,
});
