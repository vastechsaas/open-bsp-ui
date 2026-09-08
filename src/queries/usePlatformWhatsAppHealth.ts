import { useQuery } from "@tanstack/react-query";
import { type Database, supabase } from "@/supabase/client";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import type {
  WhatsAppHealthAction,
  WhatsAppHealthStatus,
} from "@/utils/PlatformWhatsAppHealthUtils";
import { queryKeys } from "./queryKeys";

export type PlatformWhatsAppHealthRow =
  Database["public"]["Functions"]["list_platform_whatsapp_health_page"]["Returns"][number];

export function usePlatformWhatsAppHealthPage(
  organizationId: string,
  params: DataTablePageParams & { status?: WhatsAppHealthStatus },
) {
  return useQuery({
    queryKey: queryKeys.platform.whatsappHealthPage(organizationId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_platform_whatsapp_health_page", {
          p_organization_id: organizationId,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_status: params.status || undefined,
        })
        .throwOnError();
      const rows = result.data as PlatformWhatsAppHealthRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
    enabled: !!organizationId,
  });
}

export function usePlatformWhatsAppHealth(
  organizationId: string,
  phoneNumberId: string,
) {
  return useQuery({
    queryKey: queryKeys.platform.whatsappHealthDetail(
      organizationId,
      phoneNumberId,
    ),
    queryFn: async () => {
      const result = await supabase
        .rpc("get_platform_whatsapp_health", {
          p_organization_id: organizationId,
          p_phone_number_id: phoneNumberId,
        })
        .throwOnError();
      return (
        (result.data?.[0] as PlatformWhatsAppHealthRow | undefined) ?? null
      );
    },
    enabled: !!organizationId && !!phoneNumberId,
  });
}

export async function runPlatformWhatsAppHealthAction({
  organizationId,
  phoneNumberId,
  action,
  signal,
}: {
  organizationId: string;
  phoneNumberId: string;
  action: WhatsAppHealthAction;
  signal?: AbortSignal;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-whatsapp-health`,
    {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: String(import.meta.env.VITE_SUPABASE_ANON_KEY),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organization_id: organizationId,
        phone_number_id: phoneNumberId,
        action,
        request_id: crypto.randomUUID(),
      }),
    },
  );

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
    synced?: number;
  };
  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `WhatsApp health action failed (${response.status})`,
    );
  }
  return result;
}
