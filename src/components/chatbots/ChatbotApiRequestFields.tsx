import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  apiRequestFieldKind,
  writeApiRequestFields,
  type ApiRequestField,
} from "@/utils/ChatbotApiEditor";

const inputClass =
  "w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground";

export function ChatbotApiRequestFields({
  fields,
  variables,
  onChange,
}: {
  fields: ApiRequestField[];
  variables: string[];
  onChange: (body: string) => void;
}) {
  const { translate: t } = useTranslation();
  const [error, setError] = useState(false);
  function commit(next: ApiRequestField[]) {
    try {
      onChange(writeApiRequestFields(next));
      setError(false);
    } catch {
      setError(true);
    }
  }
  function update(index: number, change: Partial<ApiRequestField>) {
    commit(
      fields.map((field, current) =>
        current === index ? { ...field, ...change } : field,
      ),
    );
  }
  return (
    <section className="space-y-2" data-validation-field="body_template">
      <h3 className="text-xs font-semibold">
        {t("2. Información para enviar")}
      </h3>
      <p className="text-[11px] text-muted-foreground">
        {t(
          "Agregá campos y elegí un valor fijo o una variable. No necesitás escribir JSON.",
        )}
      </p>
      {fields.map((field, index) => {
        const kind = apiRequestFieldKind(field.value);
        const variable =
          kind === "variable" ? String(field.value).slice(2, -2) : "";
        return (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-border p-2"
          >
            <div className="flex gap-2">
              <label className="min-w-0 flex-1 text-xs">
                {t("Nombre del campo")}
                <input
                  aria-label={t("Nombre del campo")}
                  className={`${inputClass} mt-1`}
                  value={field.name}
                  maxLength={128}
                  onChange={(event) =>
                    update(index, { name: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                aria-label={t("Eliminar campo")}
                className="self-end p-2 text-destructive"
                onClick={() =>
                  commit(fields.filter((_, current) => current !== index))
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs">
              {t("Tipo de valor")}
              <select
                className={`${inputClass} mt-1`}
                value={kind}
                onChange={(event) => {
                  const type = event.target.value;
                  update(index, {
                    value:
                      type === "variable"
                        ? `{{${variables[0] ?? "customer_phone"}}}`
                        : type === "number"
                          ? 0
                          : type === "boolean"
                            ? false
                            : type === "null"
                              ? null
                              : "",
                  });
                }}
              >
                <option value="string">{t("Texto fijo")}</option>
                <option value="variable">{t("Variable del chatbot")}</option>
                <option value="number">{t("Número")}</option>
                <option value="boolean">{t("Sí / No")}</option>
                <option value="null">{t("Valor vacío (null)")}</option>
              </select>
            </label>
            {kind === "variable" ? (
              <label className="block text-xs">
                {t("Variable del chatbot")}
                <select
                  className={`${inputClass} mt-1`}
                  value={variable}
                  onChange={(event) =>
                    update(index, { value: `{{${event.target.value}}}` })
                  }
                >
                  {!variables.includes(variable) && (
                    <option value={variable}>{variable}</option>
                  )}
                  {variables.map((name) => (
                    <option key={name} value={name}>
                      {name === "customer_phone"
                        ? t("Teléfono del cliente")
                        : name}
                    </option>
                  ))}
                </select>
              </label>
            ) : kind === "boolean" ? (
              <label className="block text-xs">
                {t("Valor")}
                <select
                  className={`${inputClass} mt-1`}
                  value={String(field.value)}
                  onChange={(event) =>
                    update(index, { value: event.target.value === "true" })
                  }
                >
                  <option value="true">{t("Sí")}</option>
                  <option value="false">{t("No")}</option>
                </select>
              </label>
            ) : (
              kind !== "null" && (
                <label className="block text-xs">
                  {t("Valor")}
                  <input
                    className={`${inputClass} mt-1`}
                    type={kind === "number" ? "number" : "text"}
                    value={String(field.value)}
                    maxLength={4096}
                    onChange={(event) => {
                      if (kind === "number") {
                        if (
                          event.target.value === "" ||
                          !Number.isFinite(Number(event.target.value))
                        )
                          return;
                        update(index, { value: Number(event.target.value) });
                      } else update(index, { value: event.target.value });
                    }}
                  />
                </label>
              )
            )}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(
            "Revisá nombres únicos, valores y tamaño de la solicitud. El cambio no se aplicó.",
          )}
        </p>
      )}
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-primary"
        onClick={() => {
          let suffix = fields.length + 1;
          while (fields.some((field) => field.name === `field_${suffix}`))
            suffix++;
          commit([...fields, { name: `field_${suffix}`, value: "" }]);
        }}
      >
        <Plus className="h-3 w-3" />
        {t("Agregar campo")}
      </button>
    </section>
  );
}
