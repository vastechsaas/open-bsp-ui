import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  canAccessNavigation,
  type NavigationAccess,
  type OrganizationRole,
} from "@/utils/RoleAccess";

interface LinkButtonProps {
  to: string;
  title: string;
  children: ReactNode;
  isActive?: boolean;
  className?: string;
  expanded?: boolean;
  access?: NavigationAccess;
  role?: OrganizationRole;
}

export function LinkButton({
  to,
  title,
  children,
  isActive,
  className = "",
  expanded = false,
  access,
  role,
}: LinkButtonProps) {
  if (access && !canAccessNavigation(role, access)) return null;

  return (
    <Link
      to={to}
      hash={(prevHash) => prevHash!}
      title={expanded ? undefined : title}
      aria-label={title}
      className={`relative flex h-[42px] w-full items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        expanded
          ? "justify-start gap-[12px] px-[12px]"
          : "justify-center px-[8px]"
      } ${
        isActive
          ? "bg-primary/12 text-primary before:absolute before:left-0 before:top-[9px] before:h-[24px] before:w-[3px] before:rounded-r-full before:bg-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      } ${className}`}
    >
      <span className="flex shrink-0 items-center justify-center">
        {children}
      </span>
      {expanded && (
        <span className="truncate text-[13px] font-medium">{title}</span>
      )}
    </Link>
  );
}
