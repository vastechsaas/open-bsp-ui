import type { WhatsAppHealthStatus } from "@/utils/PlatformWhatsAppHealthUtils";

const STYLES: Record<WhatsAppHealthStatus, string> = {
  healthy: "bg-emerald-500/15 text-emerald-600",
  warning: "bg-amber-500/15 text-amber-600",
  disconnected: "bg-red-500/15 text-red-600",
  unknown: "bg-muted text-muted-foreground",
};

export default function PlatformWhatsAppHealthStatus({
  status,
  label,
  checking = false,
}: {
  status: string;
  label: string;
  checking?: boolean;
}) {
  const normalized = (
    status in STYLES ? status : "unknown"
  ) as WhatsAppHealthStatus;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${STYLES[normalized]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          checking ? "animate-pulse bg-current" : "bg-current"
        }`}
      />
      {checking ? `${label}...` : label}
    </span>
  );
}
