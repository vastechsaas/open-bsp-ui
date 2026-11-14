import { useEffect, useState, type ReactNode } from "react";
import { useRouterState, type AnyRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useWorkspaceArrival,
  workspaceArrivalReady,
  WORKSPACE_ARRIVAL_MIN_MS,
} from "@/stores/workspaceArrival";
import { isSignInPath } from "@/utils/SignInUtils";
import WorkspaceArrivalScreen from "./WorkspaceArrivalScreen";
import {
  workspaceNavigationPending,
  WORKSPACE_PROGRESS_DELAY_MS,
} from "@/utils/WorkspaceLoadingUtils";

export function WorkspaceNavigationFeedback({
  children,
}: {
  children: ReactNode;
}) {
  const pending = useRouterState<AnyRouter, boolean>({
    select: (state) =>
      workspaceNavigationPending(
        state.isLoading ||
          state.matches.some(
            (match) =>
              typeof match === "object" &&
              match !== null &&
              "status" in match &&
              match.status === "pending",
          ),
        state.location.pathname,
        state.resolvedLocation?.pathname,
      ),
  });
  const startedAt = useWorkspaceArrival((state) => state.startedAt);
  const readyPath = useWorkspaceArrival((state) => state.readyPath);
  const finishArrival = useWorkspaceArrival((state) => state.finish);
  const arrivalReady = useRouterState<AnyRouter, boolean>({
    select: (state) =>
      workspaceArrivalReady({
        routeSettled:
          state.status === "idle" &&
          state.location.href === state.resolvedLocation?.href &&
          !isSignInPath(state.location.pathname),
        pathname: state.location.pathname,
        tenantRoute: state.matches.some(
          (match) =>
            typeof match === "object" &&
            match !== null &&
            "routeId" in match &&
            match.routeId === "/_auth",
        ),
        routeFailed: state.matches.some(
          (match) =>
            typeof match === "object" &&
            match !== null &&
            "status" in match &&
            (match.status === "error" || match.status === "notFound"),
        ),
        readyPath,
      }),
  });
  const arriving = startedAt !== null;
  const [show, setShow] = useState(false);
  const { translate: t } = useTranslation();

  useEffect(() => {
    if (startedAt === null || !arrivalReady) return;
    const remaining =
      WORKSPACE_ARRIVAL_MIN_MS - (performance.now() - startedAt);
    if (remaining <= 0) {
      finishArrival();
      return;
    }
    const timer = window.setTimeout(finishArrival, remaining);
    return () => window.clearTimeout(timer);
  }, [arrivalReady, finishArrival, startedAt]);

  useEffect(() => {
    if (!pending || arriving) return;
    const timer = window.setTimeout(
      () => setShow(true),
      WORKSPACE_PROGRESS_DELAY_MS,
    );
    return () => {
      window.clearTimeout(timer);
      setShow(false);
    };
  }, [arriving, pending]);

  return (
    <>
      {!arriving && pending && show && (
        <div
          role="status"
          data-testid="workspace-navigation-progress"
          className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-primary/20"
        >
          <span className="sr-only">{t("Cargando módulo…")}</span>
          <span
            aria-hidden="true"
            className="block h-full w-1/3 rounded-full bg-primary motion-safe:animate-pulse"
          />
        </div>
      )}
      <div className="contents" inert={arriving}>
        {children}
      </div>
      {arriving && <WorkspaceArrivalScreen />}
    </>
  );
}

export function WorkspaceSkeleton({
  variant = "list",
  label,
}: {
  variant?: "list" | "dashboard" | "workspace";
  label: string;
}) {
  return (
    <div
      role="status"
      data-workspace-skeleton={variant}
      className={
        variant === "workspace" ? "mx-auto w-full max-w-5xl p-6" : "w-full p-4"
      }
    >
      <span
        className={
          variant === "workspace"
            ? "mb-5 block text-sm font-medium text-foreground"
            : "sr-only"
        }
      >
        {label}
      </span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        {variant === "dashboard" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="min-h-24 rounded-xl border border-border bg-card p-4"
                >
                  <div className="mb-4 h-3 w-1/2 rounded bg-muted-foreground/20" />
                  <div className="h-6 w-1/3 rounded bg-muted-foreground/20" />
                </div>
              ))}
            </div>
            <div className="mt-4 h-64 rounded-xl border border-border bg-muted/60" />
          </>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="flex min-h-14 items-center gap-5 px-4 py-3"
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-muted-foreground/15" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/3 max-w-48 rounded bg-muted-foreground/20" />
                  <div className="h-2 w-1/2 max-w-32 rounded bg-muted-foreground/15 sm:hidden" />
                </div>
                <div className="hidden h-3 w-1/5 rounded bg-muted-foreground/15 sm:block" />
                <div className="hidden h-5 w-14 rounded-full bg-muted-foreground/15 sm:block" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkspaceLoadError({
  title,
  onRetry,
}: {
  title: string;
  onRetry: () => void;
}) {
  const { translate: t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex min-h-52 flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <p className="text-sm font-medium">{title}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
      >
        <RefreshCw aria-hidden="true" size={15} />
        {t("Reintentar")}
      </button>
    </div>
  );
}
