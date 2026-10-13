import Header from "./Header";
import ChatFilter from "./ChatFilter";
import { useTranslation } from "@/hooks/useTranslation";

export default function MessagesWorkspaceHeader() {
  const { translate: t } = useTranslation();
  return (
    <section className="messages-workspace-header min-w-0 border-b border-border bg-background text-foreground">
      <div className="flex min-w-0 items-center justify-between gap-3 pl-4 sm:pl-5">
        <h1 className="sr-only text-lg font-semibold sm:not-sr-only">
          {t("Mensajes")}
        </h1>
        <div className="ml-auto w-48 shrink-0 sm:w-56">
          <Header />
        </div>
      </div>
      <ChatFilter />
    </section>
  );
}
