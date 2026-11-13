import { isSignInPath } from "./SignInUtils";

export const WORKSPACE_PROGRESS_DELAY_MS = 200;

export function workspaceNavigationPending(
  pending: boolean,
  targetPath: string,
  resolvedPath?: string,
) {
  const normalize = (path: string) => path.replace(/\/+$/, "") || "/";
  const target = normalize(targetPath);
  const source = resolvedPath && normalize(resolvedPath);

  if (
    !pending ||
    target === source ||
    /^\/(?:onboard|oauth|privacy|terms|data-deletion)(?:\/|$)/.test(target)
  )
    return false;

  // A public sign-in route owns its button state. A protected target after
  // sign-in, and a protected route on a cold load, both use route feedback.
  return target !== "/" && !isSignInPath(target);
}

type RequiredQuery = {
  data: unknown;
  isError: boolean;
  isFetching: boolean;
};

export function workspaceStartupState({
  signedIn,
  organizations,
  invitations,
  organizationCount,
  hasPendingInvitations,
  hasActiveOrganization,
  activeOrganizationIsValid,
  membership,
  hasRole,
}: {
  signedIn: boolean;
  organizations: RequiredQuery;
  invitations: RequiredQuery;
  organizationCount: number;
  hasPendingInvitations: boolean;
  hasActiveOrganization: boolean;
  activeOrganizationIsValid: boolean;
  membership: RequiredQuery;
  hasRole: boolean;
}): "loading" | "error" | "invitation" | "ready" {
  if (!signedIn) return "loading";
  if (hasPendingInvitations) return "invitation";

  const required = [organizations, invitations];
  if (activeOrganizationIsValid) required.push(membership);

  if (
    required.some(
      (query) => query.data === undefined && query.isError && !query.isFetching,
    )
  )
    return "error";
  if (required.some((query) => query.data === undefined)) return "loading";

  if (
    (organizationCount > 0 || hasActiveOrganization) &&
    !activeOrganizationIsValid
  )
    return "loading";
  if (activeOrganizationIsValid && !hasRole)
    return membership.isFetching ? "loading" : "error";
  return "ready";
}
