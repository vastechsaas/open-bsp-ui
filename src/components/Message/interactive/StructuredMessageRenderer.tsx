import type { MessageRow, OutgoingStatus } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  InteractiveFrame,
  StructuredMessageDisplay,
} from "@/utils/MessageDisplayUtils";
import {
  ExternalLink,
  List as ListIcon,
  MapPin,
  Send,
  ShoppingBag,
  Store,
  Workflow,
} from "lucide-react";
import { TextMessage } from "../TextMessage";
import {
  ReadOnlyActionRow,
  ReadOnlyDetailsDialog,
} from "./ReadOnlyDetailsDialog";

type RendererProps = {
  display: StructuredMessageDisplay;
  agentHeader?: string;
  timestamp?: string;
  status?: OutgoingStatus;
  direction: MessageRow["direction"];
  fixedWidth?: boolean;
};

function mediaHeaderLabel(
  frame: InteractiveFrame,
  translate: (key: string) => string,
): string | undefined {
  if (frame.header?.kind !== "media") return undefined;
  const label =
    frame.header.mediaType === "image"
      ? translate("Encabezado de imagen no disponible")
      : frame.header.mediaType === "video"
        ? translate("Encabezado de video no disponible")
        : translate("Encabezado de documento no disponible");
  return frame.header.filename ? `${label}: ${frame.header.filename}` : label;
}

function FrameMessage({
  frame,
  body,
  buttons,
  ...props
}: Omit<RendererProps, "display"> & {
  frame: InteractiveFrame;
  body: string;
  buttons?: string[];
}) {
  const { translate: t } = useTranslation();
  return (
    <TextMessage
      header={props.agentHeader}
      messageHeader={
        frame.header?.kind === "text" ? frame.header.text : undefined
      }
      mediaHeaderLabel={mediaHeaderLabel(frame, t)}
      body={body}
      footer={frame.footer}
      buttons={buttons}
      type="markdown"
      direction={props.direction}
      timestamp={props.timestamp}
      status={props.status}
      fixedWidth={props.fixedWidth}
    />
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-all text-sm">{value}</div>
    </div>
  );
}

export function StructuredMessageRenderer({
  display,
  ...props
}: RendererProps) {
  const { translate: t } = useTranslation();

  if (display.kind === "text" || display.kind === "selected_reply") {
    return (
      <TextMessage
        header={props.agentHeader}
        body={display.text}
        type="markdown"
        direction={props.direction}
        timestamp={props.timestamp}
        status={props.status}
        fixedWidth={props.fixedWidth}
      />
    );
  }

  if (display.kind === "media_placeholder") {
    return (
      <TextMessage
        header={props.agentHeader}
        body={`_${t("Contenido multimedia no disponible")}_`}
        type="markdown"
        direction={props.direction}
        timestamp={props.timestamp}
        status={props.status}
        fixedWidth={props.fixedWidth}
      />
    );
  }

  if (display.kind === "interactive_buttons") {
    return (
      <FrameMessage
        {...props}
        frame={display}
        body={display.body}
        buttons={display.buttons.map((button) => button.title)}
      />
    );
  }

  if (display.kind === "interactive_list") {
    return (
      <>
        <FrameMessage {...props} frame={display} body={display.body} />
        <ReadOnlyDetailsDialog
          triggerIcon={<ListIcon className="h-[14px] w-[14px]" />}
          triggerLabel={display.buttonText}
          title={display.buttonText}
          closeLabel={t("Cerrar panel")}
        >
          {display.sections.map((section) => (
            <section key={section.title} className="mb-3 last:mb-0">
              <h3 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {section.title}
              </h3>
              <div className="overflow-hidden rounded-xl border border-border">
                {section.rows.map((row) => (
                  <div
                    key={row.id}
                    className="border-b border-border px-3 py-2.5 last:border-b-0"
                  >
                    <div className="text-sm font-medium">{row.title}</div>
                    {row.description && (
                      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {row.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </ReadOnlyDetailsDialog>
      </>
    );
  }

  if (display.kind === "product") {
    return (
      <>
        <FrameMessage
          {...props}
          frame={display}
          body={display.body || t("Información del producto no disponible")}
        />
        <div className="grid gap-2 border-t border-border p-2">
          <DetailField label={t("Catálogo")} value={display.catalogId} />
          <DetailField
            label={t("Referencia del producto")}
            value={display.productRetailerId}
          />
        </div>
        <ReadOnlyActionRow
          icon={<ShoppingBag className="h-[14px] w-[14px]" />}
          label={t("Producto no disponible para abrir")}
        />
      </>
    );
  }

  if (display.kind === "product_list") {
    return (
      <>
        <FrameMessage {...props} frame={display} body={display.body} />
        <ReadOnlyDetailsDialog
          triggerIcon={<ShoppingBag className="h-[14px] w-[14px]" />}
          triggerLabel={`${t("Ver productos")} (${display.productCount})`}
          title={t("Productos")}
          closeLabel={t("Cerrar panel")}
        >
          <div className="mb-3">
            <DetailField label={t("Catálogo")} value={display.catalogId} />
          </div>
          {display.sections.map((section) => (
            <section key={section.title} className="mb-3 last:mb-0">
              <h3 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {section.title}
              </h3>
              <div className="overflow-hidden rounded-xl border border-border">
                {section.productRetailerIds.map((id) => (
                  <div
                    key={id}
                    className="border-b border-border px-3 py-2.5 text-sm last:border-b-0"
                  >
                    {id}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </ReadOnlyDetailsDialog>
      </>
    );
  }

  if (display.kind === "catalog") {
    return (
      <>
        <FrameMessage {...props} frame={display} body={display.body} />
        {display.thumbnailProductRetailerId && (
          <div className="border-t border-border p-2">
            <DetailField
              label={t("Referencia del producto")}
              value={display.thumbnailProductRetailerId}
            />
          </div>
        )}
        <ReadOnlyActionRow
          icon={<Store className="h-[14px] w-[14px]" />}
          label={t("Ver catálogo")}
        />
      </>
    );
  }

  if (display.kind === "location_request") {
    return (
      <>
        <FrameMessage {...props} frame={display} body={display.body} />
        <ReadOnlyActionRow
          icon={<MapPin className="h-[14px] w-[14px]" />}
          label={t("Enviar ubicación")}
        />
      </>
    );
  }

  if (display.kind === "location") {
    return (
      <>
        <TextMessage
          header={props.agentHeader}
          body={`*${display.name}*\n${display.address}\n${display.latitude}, ${display.longitude}`}
          type="markdown"
          direction={props.direction}
          timestamp={props.timestamp}
          status={props.status}
          fixedWidth={props.fixedWidth}
        />
        {display.url && (
          <a
            href={display.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-[7px] border-t border-border py-3 text-center text-primary hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary dark:hover:bg-white/5"
          >
            <ExternalLink className="h-[14px] w-[14px]" />
            {t("Ver ubicación")}
          </a>
        )}
      </>
    );
  }

  if (display.kind === "flow") {
    return (
      <>
        <FrameMessage {...props} frame={display} body={display.body} />
        <ReadOnlyActionRow
          icon={<Workflow className="h-[14px] w-[14px]" />}
          label={display.cta}
        />
      </>
    );
  }

  if (display.kind === "flow_response") {
    return (
      <TextMessage
        header={props.agentHeader}
        messageHeader={display.name}
        body={`${display.body}\n\n_${t("Respuesta de Flow recibida")}_`}
        type="markdown"
        direction={props.direction}
        timestamp={props.timestamp}
        status={props.status}
        fixedWidth={props.fixedWidth}
      />
    );
  }

  if (display.kind === "order") {
    return (
      <>
        <TextMessage
          header={props.agentHeader}
          body={display.text}
          type="markdown"
          direction={props.direction}
          timestamp={props.timestamp}
          status={props.status}
          fixedWidth={props.fixedWidth}
        />
        <ReadOnlyDetailsDialog
          triggerIcon={<Send className="h-[14px] w-[14px]" />}
          triggerLabel={`${t("Ver pedido")} (${display.items.length})`}
          title={t("Pedido")}
          closeLabel={t("Cerrar panel")}
        >
          <div className="mb-3">
            <DetailField label={t("Catálogo")} value={display.catalogId} />
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            {display.items.map((item, index) => (
              <div
                key={`${item.productRetailerId}:${index}`}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="break-all text-sm font-medium">
                    {item.productRetailerId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("Cantidad")}: {item.quantity}
                  </div>
                </div>
                <div className="whitespace-nowrap text-sm">
                  {item.currency} {item.itemPrice}
                </div>
              </div>
            ))}
          </div>
          {display.total && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 font-semibold">
              <span>{t("Total")}</span>
              <span>
                {display.total.currency} {display.total.amount.toFixed(2)}
              </span>
            </div>
          )}
        </ReadOnlyDetailsDialog>
      </>
    );
  }

  return (
    <TextMessage
      header={props.agentHeader}
      body={display.data}
      type="json"
      direction={props.direction}
      timestamp={props.timestamp}
      status={props.status}
      fixedWidth={props.fixedWidth}
    />
  );
}
