import { Select } from "antd";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformOrganizations,
  usePlatformTenantSummary,
} from "@/queries/usePlatformAdmin";
import { queryKeys } from "@/queries/queryKeys";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import {
  ALL_TENANTS_VALUE,
  getPlatformScopePath,
} from "@/utils/PlatformAdminUtils";
import { resetAuthorizedCache } from "@/utils/IdbUtils";

type PlatformLayoutProps = {
  children: ReactNode;
};

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useBoundStore((state) => state.ui.user);
  const params = useParams({ strict: false }) as {
    organizationId?: string;
  };
  const organizationId = params.organizationId || null;
  const [tenantSearch, setTenantSearch] = useState("");
  const debouncedTenantSearch = useDebouncedValue(tenantSearch.trim());
  const organizations = usePlatformOrganizations({
    page: 1,
    pageSize: 20,
    search: debouncedTenantSearch || undefined,
  });
  const tenant = usePlatformTenantSummary(organizationId || "");
  const tenantOptions = (organizations.data?.rows || []).map(
    (organization) => ({
      value: organization.organization_id,
      label: organization.organization_name,
    }),
  );

  if (
    organizationId &&
    tenant.data &&
    !tenantOptions.some((option) => option.value === organizationId)
  ) {
    tenantOptions.unshift({
      value: organizationId,
      label: tenant.data.organization_name,
    });
  }

  const scopeName = organizationId
    ? tenant.data?.organization_name || t("Tenant seleccionado")
    : t("Todos los tenants");

  const selectTenant = async (value: string) => {
    await queryClient.cancelQueries({
      queryKey: queryKeys.platform.tenant(organizationId),
    });

    if (value === ALL_TENANTS_VALUE) {
      await navigate({ to: "/platform" });
      return;
    }

    await navigate({
      to: "/platform/$organizationId",
      params: { organizationId: value },
    });
  };

  return (
    <div className="grid min-h-dvh bg-muted/30 text-foreground lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <img
            src="/SocialConnectSmall.png"
            alt="Social Connect"
            className="h-9 w-9 rounded-lg object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">Social Connect</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {t("Administración de plataforma")}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-3">
          <Link
            to="/platform"
            className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5 text-[14px] font-medium text-sidebar-accent-foreground"
          >
            <LayoutDashboard className="h-5 w-5" />
            {t("Vista general")}
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <UsersRound className="h-5 w-5" />
            {t("Abrir espacio de tenant")}
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-3 text-[12px] text-muted-foreground">
            {user?.email}
          </p>
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] hover:bg-sidebar-accent"
            onClick={() => {
              void supabase.auth.signOut();
              void resetAuthorizedCache();
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("Cerrar sesión")}
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src="/SocialConnectSmall.png"
                alt="Social Connect"
                className="h-8 w-8 rounded-lg"
              />
              <span className="font-semibold">
                {t("Administración de plataforma")}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select
                showSearch
                filterOption={false}
                value={organizationId || ALL_TENANTS_VALUE}
                loading={organizations.isFetching}
                onSearch={setTenantSearch}
                onChange={(value) => void selectTenant(value)}
                className="w-full max-w-[440px]"
                options={[
                  {
                    value: ALL_TENANTS_VALUE,
                    label: t("Todos los tenants"),
                  },
                  ...tenantOptions,
                ]}
                notFoundContent={
                  organizations.isFetching
                    ? t("Cargando...")
                    : t("No se encontraron tenants")
                }
                placeholder={t("Buscar un tenant")}
              />
            </div>
            <Link
              to="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-[12px] font-medium hover:bg-muted lg:hidden"
            >
              {t("Espacio de tenant")}
            </Link>
          </div>
          <div className="flex items-center gap-2 border-t border-primary/20 bg-primary/10 px-4 py-2 text-[12px] text-primary sm:px-6">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">{t("Modo plataforma")}</span>
            <span aria-hidden="true">&mdash;</span>
            <span className="truncate">
              {t("Viendo")}: {scopeName}
            </span>
          </div>
        </header>

        <main key={getPlatformScopePath(organizationId)}>{children}</main>
      </div>
    </div>
  );
}
