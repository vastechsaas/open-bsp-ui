import type { MediaStorageStatus } from "@/queries/useMediaStorage";

export const MEDIA_STORAGE_QUOTA_OPTIONS = [25, 50, 75, 100] as const;

export function formatStorageBytes(bytes: number) {
  const gb = bytes / 1_000_000_000;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function mediaStorageStatusLabel(
  status: string,
  t: (value: string) => string,
) {
  if (status === "critical") return t("Crítico");
  if (status === "approaching") return t("Acercándose al límite");
  return t("Seguro");
}

export function mediaStorageStatusClasses(status: string) {
  if (status === "critical") {
    return "bg-red-500/15 text-red-600 dark:text-red-400";
  }
  if (status === "approaching") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
}

export function normalizeMediaStorageStatus(value: string): MediaStorageStatus {
  if (value === "critical" || value === "approaching") return value;
  return "safe";
}
