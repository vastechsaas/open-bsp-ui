import type {
  TemplateCategory,
  TemplateComponent,
  TemplateDraftInput,
} from "@/supabase/types/whatsapp_template_types";

export type TemplateEditorValues = {
  organizationAddress: string;
  name: string;
  language: string;
  category: TemplateCategory;
  header: string;
  headerSample: string;
  body: string;
  bodySamples: string[];
  footer: string;
  quickReplies: string[];
};

export function isTemplateWorkspacePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  return /^\/integrations\/whatsapp\/[^/]+\/templates(?:\/[^/]+)?$/.test(
    normalizedPath,
  );
}

export function getTemplateVariableIndexes(text: string) {
  const indexes = new Set<number>();
  for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    indexes.add(Number(match[1]));
  }
  return [...indexes].sort((left, right) => left - right);
}

function variablesAreSequential(indexes: number[]) {
  return indexes.every((index, position) => index === position + 1);
}

export function getTemplateDetailsErrors(values: TemplateEditorValues) {
  const errors: string[] = [];
  if (!values.organizationAddress)
    errors.push("Seleccioná una cuenta de WhatsApp.");
  if (!/^[a-z0-9_]+$/.test(values.name) || values.name.length > 512) {
    errors.push(
      "Usá letras minúsculas, números y guiones bajos para el nombre.",
    );
  }
  if (!values.language) errors.push("Seleccioná un idioma.");
  if (!values.category) errors.push("Seleccioná una categoría.");
  return errors;
}

export function getTemplateContentErrors(values: TemplateEditorValues) {
  const errors: string[] = [];
  const headerIndexes = getTemplateVariableIndexes(values.header);
  const bodyIndexes = getTemplateVariableIndexes(values.body);
  const trimmedBody = values.body.trim();

  if (!trimmedBody) errors.push("Agregá el cuerpo del mensaje.");
  if (values.header.length > 60)
    errors.push("Mantené el encabezado dentro de 60 caracteres.");
  if (values.body.length > 1024)
    errors.push("Mantené el cuerpo dentro de 1.024 caracteres.");
  if (values.footer.length > 60)
    errors.push("Mantené el pie dentro de 60 caracteres.");
  if (!variablesAreSequential(headerIndexes) || headerIndexes.length > 1) {
    errors.push("El encabezado solo puede usar {{1}}.");
  }
  if (headerIndexes.length && !values.headerSample.trim()) {
    errors.push("Agregá un ejemplo para la variable del encabezado.");
  }
  if (!variablesAreSequential(bodyIndexes)) {
    errors.push("Las variables del cuerpo deben ser secuenciales desde {{1}}.");
  }
  if (/^\{\{\s*\d+\s*\}\}/.test(trimmedBody)) {
    errors.push("El cuerpo no puede comenzar con una variable.");
  }
  if (/\{\{\s*\d+\s*\}\}$/.test(trimmedBody)) {
    errors.push("El cuerpo no puede terminar con una variable.");
  }
  if (bodyIndexes.some((_, index) => !values.bodySamples[index]?.trim())) {
    errors.push("Agregá un ejemplo para cada variable del cuerpo.");
  }
  if (values.quickReplies.length > 3)
    errors.push("Agregá como máximo tres respuestas rápidas.");
  if (values.quickReplies.some((reply) => !reply.trim() || reply.length > 25)) {
    errors.push("Las respuestas rápidas deben tener entre 1 y 25 caracteres.");
  }
  return errors;
}

export function buildTemplateDraftInput(
  values: TemplateEditorValues,
): TemplateDraftInput {
  const headerIndexes = getTemplateVariableIndexes(values.header);
  const bodyIndexes = getTemplateVariableIndexes(values.body);
  const components: TemplateComponent[] = [];

  if (values.header.trim()) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: values.header.trim(),
      ...(headerIndexes.length
        ? { example: { header_text: [values.headerSample.trim()] } }
        : {}),
    });
  }

  components.push({
    type: "BODY",
    text: values.body.trim(),
    ...(bodyIndexes.length
      ? {
          example: {
            body_text: [
              bodyIndexes.map(
                (_, index) => values.bodySamples[index]?.trim() || "",
              ),
            ],
          },
        }
      : {}),
  });

  if (values.footer.trim()) {
    components.push({ type: "FOOTER", text: values.footer.trim() });
  }

  const quickReplies = values.quickReplies
    .map((reply) => reply.trim())
    .filter(Boolean);
  if (quickReplies.length) {
    components.push({
      type: "BUTTONS",
      buttons: quickReplies.map((text) => ({ type: "QUICK_REPLY", text })),
    });
  }

  return {
    name: values.name.trim(),
    language: values.language,
    category: values.category,
    components,
  };
}
