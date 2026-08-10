import type { ReactNode } from "react";
import { formatPlatformMetric } from "@/utils/PlatformAdminUtils";

type PlatformMetricCardProps = {
  icon: ReactNode;
  label: string;
  value: number;
  caption?: string;
};

export default function PlatformMetricCard({
  icon,
  label,
  value,
  caption,
}: PlatformMetricCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-[26px] font-semibold tracking-tight text-foreground">
        {formatPlatformMetric(value)}
      </div>
      {caption && (
        <p className="mt-1 text-[12px] text-muted-foreground">{caption}</p>
      )}
    </article>
  );
}
