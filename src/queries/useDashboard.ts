import { useQuery } from "@tanstack/react-query";
import { type Database, supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  type DashboardPeriod,
  parseContactActivity,
  parseMessageActivity,
  parseTeamSnapshot,
} from "@/utils/DashboardUtils";
import { queryKeys } from "./queryKeys";
import { useCurrentAgent } from "./useAgents";
import { canAccessNavigation } from "@/utils/RoleAccess";
import { retryTransientRead } from "@/utils/ReadRecoveryUtils";

type DashboardMetricsRow =
  Database["public"]["Functions"]["get_dashboard_metrics"]["Returns"][number];

export type DashboardMetrics = Omit<
  DashboardMetricsRow,
  "contact_activity" | "message_activity" | "team_snapshot"
> & {
  contact_activity: ReturnType<typeof parseContactActivity>;
  message_activity: ReturnType<typeof parseMessageActivity>;
  team_snapshot: ReturnType<typeof parseTeamSnapshot>;
};

export function useDashboardMetrics(days: DashboardPeriod) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const currentAgent = useCurrentAgent();
  const allowed = canAccessNavigation(
    currentAgent.data?.extra?.role,
    "dashboard",
  );

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.metrics(organizationId, days),
      userId,
      allowed,
    ],
    queryFn: async ({ signal }) => {
      if (!userId || !allowed) throw new Error("Dashboard access required");
      const result = await supabase
        .rpc("get_dashboard_metrics", {
          p_organization_id: organizationId!,
          p_days: days,
        })
        .abortSignal(signal)
        .throwOnError();
      const row = result.data[0];

      if (!row) throw new Error("Dashboard metrics are unavailable");

      return {
        ...row,
        contact_activity: parseContactActivity(row.contact_activity),
        message_activity: parseMessageActivity(row.message_activity),
        team_snapshot: parseTeamSnapshot(row.team_snapshot),
      } satisfies DashboardMetrics;
    },
    enabled: !!organizationId && !!userId && currentAgent.isSuccess && allowed,
    retry: retryTransientRead,
  });
}
