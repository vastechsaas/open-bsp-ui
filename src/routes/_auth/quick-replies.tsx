import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Modal, message as toast } from "antd";
import { MessageSquareReply, Pencil, Plus, Search, Trash2 } from "lucide-react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  type QuickReplyListRow,
  useCreateQuickReply,
  useDeleteQuickReply,
  useQuickRepliesPage,
  useUpdateQuickReply,
} from "@/queries/useQuickReplies";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import {
  canManageQuickReplies,
  validateQuickReplyDraft,
} from "@/utils/QuickReplyUtils";

export const Route = createFileRoute("/_auth/quick-replies")({
  component: QuickRepliesWorkspace,
});

type QuickReplyDialog =
  | { type: "create" }
  | { type: "edit"; reply: QuickReplyListRow }
  | { type: "delete"; reply: QuickReplyListRow }
  | null;

function QuickRepliesWorkspace() {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [dialog, setDialog] = useState<QuickReplyDialog>(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: currentAgent } = useCurrentAgent();
  const canManage = canManageQuickReplies(currentAgent?.extra?.role);
  const { data, isLoading, isError } = useQuickRepliesPage({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });
  const deleteReply = useDeleteQuickReply();
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const hasSearch = !!search.trim();

  useEffect(() => setPage(1), [debouncedSearch]);

  const confirmDelete = async (reply: QuickReplyListRow) => {
    try {
      await deleteReply.mutateAsync(reply.id);
      setDialog(null);
      void toast.success(t("Respuesta rápida eliminada"));
    } catch {
      void toast.error(t("No se pudo eliminar la respuesta rápida"));
    }
  };

  return (
    <div className="h-full min-w-0 overflow-y-auto bg-background p-[16px] text-foreground md:p-[28px]">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-[22px] flex flex-col gap-[16px] sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[24px] font-semibold">
              {t("Respuestas rápidas")}
            </h1>
            <p className="mt-[4px] text-[13px] text-muted-foreground">
              {t("Administrá los mensajes reutilizables de tu organización.")}
            </p>
          </div>
          <button
            type="button"
            className="primary flex items-center justify-center gap-[8px] px-[18px] py-[10px] sm:ml-auto disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManage || total >= 50}
            title={
              total >= 50
                ? t("Se alcanzó el límite de 50 respuestas rápidas")
                : undefined
            }
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="h-[17px] w-[17px]" />
            {t("Nueva respuesta")}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-col gap-[10px] border-b border-border p-[14px] sm:flex-row sm:items-center">
            <label className="flex h-[40px] items-center gap-[9px] rounded-lg border border-input px-[12px] sm:max-w-[420px] sm:flex-1">
              <Search className="h-[16px] w-[16px] text-muted-foreground" />
              <input
                className="w-full border-none bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar por atajo o contenido")}
              />
            </label>
            <span className="text-[12px] font-medium text-muted-foreground sm:ml-auto">
              {total} / 50 {t("respuestas")}
            </span>
          </div>

          {isLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <QuickRepliesEmptyState
              title={t("No se pudieron cargar las respuestas rápidas")}
              description={t("Intentá nuevamente en unos minutos.")}
            />
          ) : rows.length === 0 ? (
            <QuickRepliesEmptyState
              title={
                hasSearch
                  ? t("No hay respuestas que coincidan con la búsqueda")
                  : t("Todavía no hay respuestas rápidas")
              }
              description={
                hasSearch
                  ? t("Probá con otro atajo o contenido.")
                  : t("Creá la primera respuesta reutilizable.")
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-[16px] py-[12px]">{t("Atajo")}</th>
                      <th className="px-[16px] py-[12px]">{t("Respuesta")}</th>
                      <th className="px-[16px] py-[12px]">
                        {t("Actualizada")}
                      </th>
                      <th className="px-[16px] py-[12px] text-right">
                        {t("Acciones")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((reply) => (
                      <tr key={reply.id} className="border-t border-border">
                        <td className="px-[16px] py-[14px] align-top font-semibold text-primary">
                          {reply.shortcut}
                        </td>
                        <td className="max-w-[700px] whitespace-pre-wrap px-[16px] py-[14px] text-[14px]">
                          {reply.content}
                        </td>
                        <td className="whitespace-nowrap px-[16px] py-[14px] text-[13px] text-muted-foreground">
                          {new Date(reply.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-[16px] py-[14px]">
                          <QuickReplyActions
                            reply={reply}
                            onEdit={() => setDialog({ type: "edit", reply })}
                            onDelete={() =>
                              setDialog({ type: "delete", reply })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border md:hidden">
                {rows.map((reply) => (
                  <div key={reply.id} className="p-[14px]">
                    <div className="flex items-start gap-[12px]">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-primary">
                          {reply.shortcut}
                        </div>
                        <div className="mt-[6px] whitespace-pre-wrap text-[14px]">
                          {reply.content}
                        </div>
                      </div>
                      <QuickReplyActions
                        reply={reply}
                        onEdit={() => setDialog({ type: "edit", reply })}
                        onDelete={() => setDialog({ type: "delete", reply })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col justify-between gap-[10px] border-t border-border px-[14px] py-[12px] text-[12px] text-muted-foreground sm:flex-row sm:items-center">
            <span>
              {total} / 50 {t("respuestas")}
            </span>
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              disabled={isLoading}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {(dialog?.type === "create" || dialog?.type === "edit") && (
        <QuickReplyEditor
          key={dialog.type === "edit" ? dialog.reply.id : "create"}
          reply={dialog.type === "edit" ? dialog.reply : undefined}
          onClose={() => setDialog(null)}
        />
      )}

      <Modal
        open={dialog?.type === "delete"}
        title={t("Eliminar respuesta rápida")}
        okText={t("Eliminar")}
        cancelText={t("Cancelar")}
        okButtonProps={{ danger: true }}
        confirmLoading={deleteReply.isPending}
        onCancel={() => setDialog(null)}
        onOk={() =>
          dialog?.type === "delete"
            ? confirmDelete(dialog.reply)
            : Promise.resolve()
        }
      >
        <p>{t("Esta acción no se puede deshacer.")}</p>
        {dialog?.type === "delete" && (
          <p className="mt-2 font-semibold text-primary">
            {dialog.reply.shortcut}
          </p>
        )}
      </Modal>
    </div>
  );
}

function QuickReplyActions({
  reply,
  onEdit,
  onDelete,
}: {
  reply: QuickReplyListRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { translate: t } = useTranslation();

  return (
    <div className="flex justify-end gap-[6px]" data-quick-reply={reply.id}>
      <button
        type="button"
        className="rounded-lg border border-border p-[8px] hover:bg-accent"
        title={t("Editar")}
        onClick={onEdit}
      >
        <Pencil className="h-[15px] w-[15px]" />
      </button>
      <button
        type="button"
        className="rounded-lg border border-red-300 p-[8px] text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        title={t("Eliminar")}
        onClick={onDelete}
      >
        <Trash2 className="h-[15px] w-[15px]" />
      </button>
    </div>
  );
}

function QuickReplyEditor({
  reply,
  onClose,
}: {
  reply?: QuickReplyListRow;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const [shortcut, setShortcut] = useState(reply?.shortcut || "");
  const [content, setContent] = useState(reply?.content || "");
  const createReply = useCreateQuickReply();
  const updateReply = useUpdateQuickReply();
  const validation = validateQuickReplyDraft(shortcut, content);
  const saving = createReply.isPending || updateReply.isPending;

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!validation.valid || saving) return;

    try {
      if (reply) {
        await updateReply.mutateAsync({ id: reply.id, ...validation });
        void toast.success(t("Respuesta rápida actualizada"));
      } else {
        await createReply.mutateAsync(validation);
        void toast.success(t("Respuesta rápida creada"));
      }
      onClose();
    } catch {
      void toast.error(t("No se pudo guardar la respuesta rápida"));
    }
  };

  return (
    <Modal
      open
      title={reply ? t("Editar respuesta rápida") : t("Nueva respuesta rápida")}
      okText={reply ? t("Guardar") : t("Crear")}
      cancelText={t("Cancelar")}
      confirmLoading={saving}
      okButtonProps={{ disabled: !validation.valid }}
      onCancel={onClose}
      onOk={() => save()}
    >
      <form className="space-y-4 pt-2" onSubmit={save}>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium">
            {t("Atajo")}
          </span>
          <input
            autoFocus
            className="h-[40px] w-full rounded-lg border border-input bg-background px-[12px] text-[14px] outline-none focus:border-primary"
            value={shortcut}
            maxLength={30}
            placeholder="/welcome"
            onChange={(event) => setShortcut(event.target.value)}
          />
          {!validation.shortcutValid && shortcut.length > 0 && (
            <span className="mt-1 block text-[12px] text-red-600">
              {t(
                "Usá hasta 30 caracteres: letras, números, guiones o guiones bajos.",
              )}
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium">
            {t("Respuesta")}
          </span>
          <textarea
            className="min-h-[140px] w-full resize-y rounded-lg border border-input bg-background px-[12px] py-[10px] text-[14px] outline-none focus:border-primary"
            value={content}
            maxLength={1000}
            placeholder={t("Escribí la respuesta reutilizable")}
            onChange={(event) => setContent(event.target.value)}
          />
          <span className="mt-1 block text-right text-[11px] text-muted-foreground">
            {content.length} / 1000
          </span>
        </label>
      </form>
    </Modal>
  );
}

function QuickRepliesEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        <MessageSquareReply className="h-[24px] w-[24px]" />
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-1 max-w-[420px] text-[13px] text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
