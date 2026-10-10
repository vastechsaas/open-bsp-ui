import { useState } from "react";
import { ChatbotValidationField } from "./ChatbotValidationField";
import { Plus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChatbotWebhookResponseMapping } from "@/utils/ChatbotFlowUtils";
import {
  formatResponseList,
  responseValueAtPath,
  type ResponseListFormat,
} from "@/utils/ChatbotResponseFormatter";
import { discoverApiResponsePaths } from "@/utils/ChatbotApiEditor";

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
  guided = false,
}: {
  mappings: ChatbotWebhookResponseMapping[];
  onChange: (mappings: ChatbotWebhookResponseMapping[]) => void;
  guided?: boolean;
}) {
  const { translate: t } = useTranslation();
  const [sample, setSample] = useState("");
  let sampleBody: unknown;
  let sampleInvalid = false;
  try {
    if (sample.trim()) sampleBody = JSON.parse(sample);
  } catch {
    sampleInvalid = true;
  }
  const responsePaths =
    sample.trim() && !sampleInvalid ? discoverApiResponsePaths(sampleBody) : [];
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
      if (!mapping.format) {
        const value = responseValueAtPath(body, mapping.path);
        if (
          value !== null &&
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean"
        )
          return {
            error: t(
              "Elegí un valor simple o usá Lista formateada para una lista.",
            ),
          };
        return { text: value === null ? "null" : String(value) };
      }
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
        const result = sample.trim() ? preview(mapping) : null;
        let itemPaths: string[] = [];
        try {
          const items = responseValueAtPath(sampleBody, mapping.path);
          if (Array.isArray(items) && items.length)
            itemPaths = discoverApiResponsePaths(items[0]).filter(
              (path) =>
                path !== "$" ||
                items[0] === null ||
                typeof items[0] !== "object",
            );
        } catch {
          /* Invalid sample paths are shown by the preview. */
        }
        return (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-border p-2"
          >
            <div className="flex items-start gap-2">
              <label className="min-w-0 flex-1 text-xs">
                {guided
                  ? t("Información de la respuesta")
                  : t("Ruta de respuesta")}
                <ChatbotValidationField
                  path={["response_mappings", index, "path"]}
                >
                  <input
                    className={inputClass}
                    value={mapping.path}
                    placeholder="data.items"
                    onChange={(event) =>
                      update(index, { path: event.target.value })
                    }
                  />
                </ChatbotValidationField>
                {responsePaths.length > 0 && (
                  <select
                    className={inputClass}
                    aria-label={t("Elegir campo del ejemplo")}
                    value={
                      responsePaths.includes(mapping.path) ? mapping.path : ""
                    }
                    onChange={(event) => {
                      if (event.target.value)
                        update(index, { path: event.target.value });
                    }}
                  >
                    <option value="">{t("Elegir campo del ejemplo")}</option>
                    {responsePaths.map((path) => (
                      <option key={path} value={path}>
                        {path}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="min-w-0 flex-1 text-xs">
                {guided ? t("Guardar como variable") : t("Variable de salida")}
                <ChatbotValidationField
                  path={["response_mappings", index, "variable"]}
                >
                  <input
                    className={inputClass}
                    value={mapping.variable}
                    placeholder="items_text"
                    onChange={(event) =>
                      update(index, { variable: event.target.value })
                    }
                  />
                </ChatbotValidationField>
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
              <ChatbotValidationField
                path={["response_mappings", index, "format"]}
              >
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
              </ChatbotValidationField>
            </label>
            {mapping.format && (
              <>
                <label className="block text-xs">
                  {t("Plantilla por elemento")}
                  <ChatbotValidationField
                    path={[
                      "response_mappings",
                      index,
                      "format",
                      "item_template",
                    ]}
                  >
                    <textarea
                      className={`${inputClass} min-h-24 font-mono`}
                      maxLength={2000}
                      value={mapping.format.item_template}
                      onChange={(event) =>
                        updateFormat(index, {
                          item_template: event.target.value,
                        })
                      }
                    />
                  </ChatbotValidationField>
                </label>
                {guided && itemPaths.length > 0 && (
                  <div
                    className="flex flex-wrap gap-1"
                    aria-label={t("Agregar información al mensaje")}
                  >
                    {itemPaths.map((path) => (
                      <button
                        key={path}
                        type="button"
                        className="rounded-md border border-primary/30 px-2 py-1 text-[11px] text-primary"
                        onClick={() =>
                          updateFormat(index, {
                            item_template: `${mapping.format!.item_template}${mapping.format!.item_template ? "\n" : ""}{{${path === "$" ? "item" : `item.${path}`}}}`,
                          })
                        }
                      >
                        {path === "$" ? t("Valor") : path}
                      </button>
                    ))}
                  </div>
                )}
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
                <details open={!guided}>
                  <summary className="cursor-pointer text-xs text-primary">
                    {t("Opciones de formato")}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        {t("Separador entre elementos")}
                        <ChatbotValidationField
                          path={[
                            "response_mappings",
                            index,
                            "format",
                            "separator",
                          ]}
                        >
                          <select
                            className={inputClass}
                            value={mapping.format.separator}
                            onChange={(event) =>
                              updateFormat(index, {
                                separator: event.target.value,
                              })
                            }
                          >
                            <option value={"\n\n"}>
                              {t("Línea en blanco")}
                            </option>
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
                        </ChatbotValidationField>
                      </label>
                      <label className="text-xs">
                        {t("Separador de valores")}
                        <ChatbotValidationField
                          path={[
                            "response_mappings",
                            index,
                            "format",
                            "array_separator",
                          ]}
                        >
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
                        </ChatbotValidationField>
                      </label>
                    </div>
                    <label className="block text-xs">
                      {t("Texto si la lista está vacía")}
                      <ChatbotValidationField
                        path={[
                          "response_mappings",
                          index,
                          "format",
                          "empty_text",
                        ]}
                      >
                        <input
                          className={inputClass}
                          maxLength={500}
                          value={mapping.format.empty_text}
                          onChange={(event) =>
                            updateFormat(index, {
                              empty_text: event.target.value,
                            })
                          }
                        />
                      </ChatbotValidationField>
                    </label>
                    <label className="block text-xs">
                      {t("Máximo de elementos")}
                      <ChatbotValidationField
                        path={[
                          "response_mappings",
                          index,
                          "format",
                          "max_items",
                        ]}
                      >
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
                      </ChatbotValidationField>
                    </label>
                  </div>
                </details>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "No se recortan resultados. Si faltan campos o se superan los límites, se usa la ruta de error de la API.",
                  )}
                </p>
              </>
            )}
            {result &&
              ("error" in result ? (
                <p role="alert" className="text-xs text-destructive">
                  {result.error}
                </p>
              ) : (
                <pre
                  aria-label={t("Vista previa del mensaje")}
                  className="whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-xs text-foreground"
                >
                  {result.text}
                </pre>
              ))}
          </div>
        );
      })}
      {(guided || mappings.some((mapping) => mapping.format)) && (
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
      {guided && sampleInvalid && (
        <p role="alert" className="text-xs text-destructive">
          {t("Ingresá una respuesta JSON válida para la vista previa.")}
        </p>
      )}
    </section>
  );
}
