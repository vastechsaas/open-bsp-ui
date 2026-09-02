import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Spinner from "@/components/Spinner";
import { useCurrentAgent } from "@/queries/useAgents";

export const Route = createFileRoute("/_auth/settings/")({
  component: SettingsIndex,
});

function SettingsIndex() {
  const navigate = useNavigate();
  const { data: currentAgent, isLoading } = useCurrentAgent();

  useEffect(() => {
    if (isLoading) return;
    void navigate({
      to:
        currentAgent?.extra?.role === "agent"
          ? "/settings/media-management"
          : currentAgent?.extra?.role === "supervisor"
            ? "/settings/routing-queues"
            : "/settings/organization",
      replace: true,
    });
  }, [currentAgent?.extra?.role, isLoading, navigate]);

  return (
    <div className="flex h-full items-center justify-center">
      <Spinner />
    </div>
  );
}
