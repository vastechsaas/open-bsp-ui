export const ALL_TENANTS_VALUE = "all";

export function isPlatformPath(pathname: string) {
  return pathname === "/platform" || pathname.startsWith("/platform/");
}

export function getAuthenticatedHomePath(platformAdmin: boolean) {
  return platformAdmin ? "/platform" : "/dashboard";
}

export function getPlatformScopePath(organizationId?: string | null) {
  return organizationId ? `/platform/${organizationId}` : "/platform";
}

export function formatPlatformMetric(value: number | bigint | null) {
  return new Intl.NumberFormat().format(Number(value || 0));
}
