import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { carouselPreviewUrl } from "@/queries/carouselMedia";
import {
  newCarouselCard,
  type CarouselCardValue,
  type CarouselIssue,
} from "@/utils/CarouselUtils";
import { getTemplateVariableIndexes } from "@/utils/TemplateDraftUtils";

export function CarouselImage({ card }: { card: CarouselCardValue }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    const local = card.file ? URL.createObjectURL(card.file) : undefined;
    setUrl(local);
    if (!local && card.asset)
      void carouselPreviewUrl(card.asset)
        .then((value) => {
          if (active) setUrl(value);
        })
        .catch(() => undefined);
    return () => {
      active = false;
      if (local) URL.revokeObjectURL(local);
    };
  }, [card.file, card.asset]);
  return url ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <ImageIcon className="m-auto h-[28px] w-[28px] text-muted-foreground" />
  );
}

export default function CarouselTemplateContent({
  cards,
  onChange,
  selectedId,
  onSelect,
  readOnly,
  issues,
}: {
  cards: CarouselCardValue[];
  onChange: (cards: CarouselCardValue[]) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
  readOnly: boolean;
  issues: CarouselIssue[];
}) {
  const { translate: t } = useTranslation();
  const index = Math.max(
    0,
    cards.findIndex((card) => card.id === selectedId),
  );
  const selected = cards[index];
  if (!selected) return null;
  const update = (patch: Partial<CarouselCardValue>) =>
    onChange(
      cards.map((card) =>
        card.id === selected.id ? { ...card, ...patch } : card,
      ),
    );
  const move = (direction: number) => {
    const next = [...cards];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  };
  const add = (duplicate = false) => {
    const card = duplicate
      ? {
          ...selected,
          id: crypto.randomUUID(),
          asset: selected.asset
            ? { ...selected.asset, card_id: crypto.randomUUID() }
            : undefined,
        }
      : newCarouselCard();
    if (card.asset) card.asset.card_id = card.id;
    onChange([...cards.slice(0, index + 1), card, ...cards.slice(index + 1)]);
    onSelect(card.id);
  };
  const input =
    "w-full rounded-lg border border-border bg-background p-[10px] text-[13px] disabled:opacity-60";
  const invalid = (field: CarouselIssue["field"]) =>
    issues.some(
      (issue) => issue.cardId === selected.id && issue.field === field,
    );
  return (
    <section className="mt-[18px] rounded-xl border border-border bg-card p-[18px]">
      <div className="flex items-center justify-between gap-[12px]">
        <h2 className="font-semibold">
          {t("Tarjetas del carrusel")} · {cards.length}/10
        </h2>
        <button
          type="button"
          disabled={readOnly || cards.length >= 10}
          onClick={() => add()}
          className="flex items-center gap-[5px] rounded-lg border border-border p-[8px] disabled:opacity-40"
        >
          <Plus size={16} />
          {t("Agregar tarjeta")}
        </button>
      </div>
      <div
        className="my-[16px] flex gap-[10px] overflow-x-auto pb-[8px]"
        role="tablist"
        aria-label={t("Tarjetas del carrusel")}
      >
        {cards.map((card, position) => (
          <button
            type="button"
            role="tab"
            aria-selected={card.id === selected.id}
            key={card.id}
            onClick={() => onSelect(card.id)}
            className={`w-[88px] shrink-0 overflow-hidden rounded-lg border ${card.id === selected.id ? "border-primary ring-1 ring-primary" : "border-border"}`}
          >
            <div className="flex h-[58px] bg-muted">
              <CarouselImage card={card} />
            </div>
            <span className="block p-[5px] text-[11px]">
              {t("Tarjeta")} {position + 1}
            </span>
          </button>
        ))}
      </div>
      <div className="mb-[16px] flex flex-wrap items-center gap-[8px] text-[12px]">
        <strong className="mr-auto">
          {t("Tarjeta")} {index + 1}
        </strong>
        <button
          type="button"
          title={t("Mover a la izquierda")}
          aria-label={t("Mover a la izquierda")}
          disabled={readOnly || index === 0}
          onClick={() => move(-1)}
          className="rounded border border-border p-[7px] disabled:opacity-30"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          title={t("Mover a la derecha")}
          aria-label={t("Mover a la derecha")}
          disabled={readOnly || index === cards.length - 1}
          onClick={() => move(1)}
          className="rounded border border-border p-[7px] disabled:opacity-30"
        >
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          disabled={readOnly || cards.length >= 10}
          onClick={() => add(true)}
          className="flex items-center gap-[5px] rounded border border-border p-[7px] disabled:opacity-30"
        >
          <Copy size={14} />
          {t("Duplicar")}
        </button>
        <button
          type="button"
          aria-label={t("Eliminar tarjeta")}
          disabled={readOnly || cards.length <= 2}
          onClick={() => {
            const next = cards.filter((card) => card.id !== selected.id);
            onChange(next);
            onSelect(next[Math.min(index, next.length - 1)].id);
          }}
          className="rounded border border-border p-[7px] text-destructive disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <fieldset
        key={selected.id}
        disabled={readOnly}
        className="space-y-[14px] [&_[aria-invalid=true]]:border-destructive [&_[aria-invalid=true]]:ring-1 [&_[aria-invalid=true]]:ring-destructive"
      >
        <label
          className="block text-[12px]"
          htmlFor={`carousel-${selected.id}-image`}
        >
          {t("Imagen de tarjeta")} · JPEG / PNG · 5 MB
          <input
            id={`carousel-${selected.id}-image`}
            type="file"
            accept="image/jpeg,image/png"
            aria-invalid={invalid("image")}
            className={`${input} mt-[6px]`}
            onChange={(event) => update({ file: event.target.files?.[0] })}
          />
        </label>
        <label className="block text-[12px]">
          {t("Texto de tarjeta")} · {selected.text.length}/160
          <textarea
            id={`carousel-${selected.id}-text`}
            aria-invalid={invalid("text")}
            className={`${input} mt-[6px]`}
            rows={4}
            value={selected.text}
            onChange={(event) => update({ text: event.target.value })}
          />
        </label>
        <button
          type="button"
          className="text-[12px] text-primary"
          onClick={() =>
            update({
              text: `${selected.text} {{${getTemplateVariableIndexes(selected.text).length + 1}}}`,
              samples: [...selected.samples, ""],
            })
          }
        >
          {t("Insertar variable")}
        </button>
        {getTemplateVariableIndexes(selected.text).map((variable, position) => (
          <label key={variable} className="block text-[12px]">
            {t("Ejemplo")} {`{{${variable}}}`}
            <input
              id={`carousel-${selected.id}-samples-${position}`}
              aria-invalid={invalid("samples")}
              className={`${input} mt-[6px]`}
              value={selected.samples[position] || ""}
              onChange={(event) => {
                const samples = [...selected.samples];
                samples[position] = event.target.value;
                update({ samples });
              }}
            />
          </label>
        ))}
        <label className="block text-[12px]">
          {t("Texto del botón de sitio web")} · 25
          <input
            id={`carousel-${selected.id}-label`}
            aria-invalid={invalid("label")}
            className={`${input} mt-[6px]`}
            value={selected.label}
            onChange={(event) => update({ label: event.target.value })}
          />
        </label>
        <label className="block text-[12px]">
          {t("URL del sitio web")}
          <input
            id={`carousel-${selected.id}-url`}
            aria-invalid={invalid("url")}
            className={`${input} mt-[6px]`}
            placeholder="https://example.com/products"
            value={selected.url}
            onChange={(event) => update({ url: event.target.value })}
          />
        </label>
        <p className="text-[12px] text-muted-foreground">
          {t(
            "Usá un enlace HTTPS fijo o agregá {{1}} al final para personalizarlo.",
          )}
        </p>
        {selected.url.includes("{{1}}") && (
          <label className="block text-[12px]">
            {t("URL de ejemplo completa")}
            <input
              className={`${input} mt-[6px]`}
              value={selected.urlSample}
              onChange={(event) => update({ urlSample: event.target.value })}
            />
          </label>
        )}
      </fieldset>
    </section>
  );
}

export function CarouselPreview({
  introduction,
  cards,
}: {
  introduction: string;
  cards: CarouselCardValue[];
}) {
  const { translate: t } = useTranslation();
  return (
    <div className="p-[12px]">
      <p className="mb-[12px] whitespace-pre-wrap rounded-lg bg-card p-[12px] text-[13px]">
        {introduction}
      </p>
      <div className="flex snap-x gap-[12px] overflow-x-auto pb-[12px]">
        {cards.map((card) => (
          <div
            key={card.id}
            className="w-[240px] shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="flex h-[140px] bg-muted">
              <CarouselImage card={card} />
            </div>
            <p className="min-h-[72px] whitespace-pre-wrap p-[12px] text-[13px]">
              {card.text.replace(
                /\{\{\s*(\d+)\s*\}\}/g,
                (match, index) => card.samples[Number(index) - 1] || match,
              )}
            </p>
            <div className="border-t border-border p-[10px] text-center text-[13px] text-primary">
              {card.label || t("Botón de sitio web")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
