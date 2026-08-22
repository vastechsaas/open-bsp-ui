import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export default function ActionCard({
  icon,
  title,
  to,
  disabled = false,
  disabledReason,
}: {
  icon: ReactNode;
  title: string;
  to: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const content = (
    <div
      className={`flex flex-col items-center gap-[16px] ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
      title={disabled ? disabledReason : undefined}
    >
      <div
        className={`flex h-[96px] w-[96px] items-center justify-center rounded-2xl bg-background text-foreground transition-colors ${disabled ? "" : "hover:bg-background/60"}`}
      >
        {icon}
      </div>
      <div className="word-break flex min-h-[32px] w-[96px] items-start justify-center text-center text-[14px] leading-[16px] text-foreground">
        {title}
      </div>
    </div>
  );

  if (disabled) {
    return <div aria-disabled="true">{content}</div>;
  }

  return <Link to={to}>{content}</Link>;
}
