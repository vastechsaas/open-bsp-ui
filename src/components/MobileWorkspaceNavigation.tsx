import { useState } from "react";
import { Drawer } from "antd";
import { Menu as MenuIcon } from "lucide-react";
import Menu from "./Menu";
import { useTranslation } from "@/hooks/useTranslation";

export default function MobileWorkspaceNavigation() {
  const { translate: t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 text-foreground md:hidden">
        <button
          type="button"
          aria-label={t("Expandir navegación")}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="mobile-workspace-navigation"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MenuIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-sm font-medium">{t("Navegación principal")}</span>
      </header>
      <Drawer
        title={t("Navegación principal")}
        placement="left"
        size={280}
        open={open}
        onClose={() => setOpen(false)}
        closable={{ "aria-label": t("Cerrar") }}
        destroyOnHidden
        styles={{
          body: { padding: 0, display: "flex", minHeight: 0 },
          wrapper: { maxWidth: "calc(100vw - 24px)" },
        }}
        classNames={{
          header: "!border-sidebar-border !bg-sidebar !text-sidebar-foreground",
          section: "!bg-sidebar !text-sidebar-foreground",
        }}
      >
        <div
          id="mobile-workspace-navigation"
          className="flex min-h-0 flex-1"
          onClickCapture={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a[href]")
            ) {
              setOpen(false);
            }
          }}
        >
          <Menu expanded canToggle={false} onToggle={() => undefined} />
        </div>
      </Drawer>
    </>
  );
}
