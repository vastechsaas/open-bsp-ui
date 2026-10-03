import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChatbotWebhookResponseMapping } from "@/utils/ChatbotFlowUtils";
import {
  formatResponseList,
  responseValueAtPath,
  type ResponseListFormat,
} from "@/utils/ChatbotResponseFormatter";

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground";
const defaultFormat = (): ResponseListFormat => ({
  kind: "list",
  item_template: "{{index}}. {{item.name}}",
  separator: "\n\n",
  array_separator: ", ",
  empty_text: "",
  max_items: 20,
});

export function ChatbotResponseMappings({
  mappings,
  onChange,
}: {
  mappings: ChatbotWebhookResponseMapping[];
  onChange: (mappings: ChatbotWebhookResponseMapping[]) => void;
}) {
  const { translate: t } = useTranslation();
  const [sample, setSample] = useState("");
  function update(
    index: number,
    values: Partial<ChatbotWebhookResponseMapping>,
  ) {
    onChange(
      mappings.map((mapping, current) =>
        current === index ? { ...mapping, ...values } : mapping,
      ),
    );
  }
  function updateFormat(index: number, values: Partial<ResponseListFormat>) {
    update(index, { format: { ...mappings[index].format!, ...values } });
  }
  function preview(mapping: ChatbotWebhookResponseMapping) {
    try {
      const body: unknown = JSON.parse(sample);
      const result = formatResponseList(
        responseValueAtPath(body, mapping.path),
        body,
        mapping.format!,
      );
      return result.ok
        ? { text: result.text }
        : {
            error: t(
              "Revisá la ruta, los campos, la plantilla y los límites del formato.",
            ),
          };
    } catch {
      return {
        error: t("Ingresá una respuesta JSON válida para la vista previa."),
      };
    }
  }
  return (
    <section
      className="space-y-3"
      data-validation-field="response_mappings"
      aria-label={t("Mapear respuesta")}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{t("Mapear respuesta")}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-primary"
          onClick={() => onChange([...mappings, { path: "", variable: "" }])}
        >
          <Plus className="h-3 w-3" />
          {t("Agregar")}
        </button>
      </div>
      {mappings.map((mapping, index) => {
        const result =
          sample.trim() && mapping.format ? preview(mapping) : null;
        return (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-border p-2"
          >
            <div className="flex items-start gap-2">
              <label className="min-w-0 flex-1 text-xs">
                {t("Ruta de respuesta")}
                <input
                  className={inputClass}
                  value={mapping.path}
                  placeholder="data.items"
                  onChange={(event) =>
                    update(index, { path: event.target.value })
                  }
                />
              </label>
              <label className="min-w-0 flex-1 text-xs">
                {t("Variable de salida")}
                <input
                  className={inputClass}
                  value={mapping.variable}
                  placeholder="items_text"
                  onChange={(event) =>
                    update(index, { variable: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="mt-5 text-destructive"
                aria-label={t("Eliminar")}
                onClick={() =>
                  onChange(mappings.filter((_, current) => current !== index))
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs">
              {t("Formato de respuesta")}
              <select
                className={inputClass}
                value={mapping.format ? "list" : "value"}
                onChange={(event) =>
                  update(index, {
                    format:
                      event.target.value === "list"
                        ? defaultFormat()
                        : undefined,
                  })
                }
              >
                <option value="value">{t("Valor simple")}</option>
                <option value="list">{t("Lista formateada")}</option>
              </select>
            </label>
            {mapping.format && (
              <>
                <label className="block text-xs">
                  {t("Plantilla por elemento")}
                  <textarea
                    className={`${inputClass} min-h-24 font-mono`}
                    maxLength={2000}
                    value={mapping.format.item_template}
                    onChange={(event) =>
                      updateFormat(index, { item_template: event.target.value })
                    }
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "Usá campos de item o response e index. Las listas de valores simples se unen con el separador de valores.",
                  )}
                </p>
                <code className="block text-[11px] text-muted-foreground">
                  {
                    "{{item.name}} · {{item.features}} · {{response.currency}} · {{index}}"
                  }
                </code>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">
                    {t("Separador entre elementos")}
                    <select
                      className={inputClass}
                      value={mapping.format.separator}
                      onChange={(event) =>
                        updateFormat(index, { separator: event.target.value })
                      }
                    >
                      <option value={"\n\n"}>{t("Línea en blanco")}</option>
                      <option value={"\n"}>{t("Salto de línea")}</option>
                      <option value=", ">{t("Coma")}</option>
                      {!["\n\n", "\n", ", "].includes(
                        mapping.format.separator,
                      ) && (
                        <option value={mapping.format.separator}>
                          {t("Personalizado")}
                        </option>
                      )}
                    </select>
                  </label>
                  <label className="text-xs">
                    {t("Separador de valores")}
                    <input
                      className={inputClass}
                      maxLength={32}
                      value={mapping.format.array_separator}
                      onChange={(event) =>
                        updateFormat(index, {
                          array_separator: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  {t("Texto si la lista está vacía")}
                  <input
                    className={inputClass}
                    maxLength={500}
                    value={mapping.format.empty_text}
                    onChange={(event) =>
                      updateFormat(index, { empty_text: event.target.value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {t("Máximo de elementos")}
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={50}
                    value={mapping.format.max_items}
                    onChange={(event) =>
                      updateFormat(index, {
                        max_items: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "No se recortan resultados. Si faltan campos o se superan los límites, se usa la ruta de error de la API.",
                  )}
                </p>
                {result &&
                  ("error" in result ? (
                    <p role="alert" className="text-xs text-destructive">
                      {result.error}
                    </p>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-xs text-foreground">
                      {result.text}
                    </pre>
                  ))}
              </>
            )}
          </div>
        );
      })}
      {mappings.some((mapping) => mapping.format) && (
        <label className="block text-xs">
          {t("Respuesta JSON de ejemplo")}
          <textarea
            className={`${inputClass} min-h-24 font-mono`}
            value={sample}
            maxLength={65536}
            placeholder={'{"items":[{"name":"Example"}]}'}
            onChange={(event) => setSample(event.target.value)}
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t(
              "Vista previa local: no llama a la API ni guarda el ejemplo. No pegues datos sensibles.",
            )}
          </span>
        </label>
      )}
    </section>
  );
}
