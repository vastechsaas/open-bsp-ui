import { useTranslation } from "@/hooks/useTranslation";
import { LinkButton } from "@/components/LinkButton";
import { useCurrentOrganization } from "@/queries/useOrganizations";
import { MessageSquarePlus } from "lucide-react";
import NotificationCenter from "@/components/NotificationCenter";
import AssignmentAvailabilityControl from "@/components/AssignmentAvailabilityControl";

export default function Header() {
  const { data: org } = useCurrentOrganization();

  const { translate: t } = useTranslation();
  const organizationName = org?.name || "Social Connect";

  return (
    <div className="header conversation-header grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div className="min-w-0">
        <div
          className="truncate whitespace-nowrap text-[24px] font-bold tracking-tighter text-primary"
          title={organizationName}
        >
          {organizationName}
        </div>
      </div>
      <div className="flex min-w-max shrink-0 items-center justify-end gap-1.5">
        <AssignmentAvailabilityControl />
        <NotificationCenter />
        <LinkButton
          to="/conversations/new"
          className="!h-[38px] !w-[38px] !shrink-0 !p-0"
          title={t("Nueva conversación")}
        >
          <MessageSquarePlus className="w-[24px] h-[24px] text-foreground" />
        </LinkButton>
      </div>
    </div>
  );
}
