import { create } from "zustand";

export const WORKSPACE_ARRIVAL_MIN_MS = 600;

export function workspaceArrivalReady({
  routeSettled,
  pathname,
  tenantRoute,
  routeFailed,
  readyPath,
}: {
  routeSettled: boolean;
  pathname: string;
  tenantRoute: boolean;
  routeFailed: boolean;
  readyPath: string | null;
}) {
  return (
    routeSettled && (routeFailed || !tenantRoute || readyPath === pathname)
  );
}

type WorkspaceArrival = {
  startedAt: number | null;
  readyPath: string | null;
  begin: () => void;
  ready: (path: string) => void;
  finish: () => void;
};

// In-memory only: route changes keep one loading screen, but a page reload or
// ordinary sidebar navigation never starts a new sign-in transition.
export const useWorkspaceArrival = create<WorkspaceArrival>((set) => ({
  startedAt: null,
  readyPath: null,
  begin: () =>
    set((state) =>
      state.startedAt === null
        ? { startedAt: performance.now(), readyPath: null }
        : state,
    ),
  ready: (path) =>
    set((state) =>
      state.startedAt !== null && state.readyPath !== path
        ? { readyPath: path }
        : state,
    ),
  finish: () => set({ startedAt: null, readyPath: null }),
}));
