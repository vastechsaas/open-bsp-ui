import type {
  MediaHeaderFormat,
  TemplateCategory,
  TemplateComponent,
  TemplateDraftInput,
} from "@/supabase/types/whatsapp_template_types";

export type TemplateHeaderFormat = "NONE" | "TEXT" | MediaHeaderFormat;

export type TemplateEditorValues = {
  organizationAddress: string;
  name: string;
  language: string;
  category: TemplateCategory;
  headerFormat: TemplateHeaderFormat;
  header: string;
  headerSample: string;
  body: string;
  bodySamples: string[];
  footer: string;
  quickReplies: string[];
};

export type TemplateEditorStep = 1 | 2 | 3;
export type TemplateAction = "view" | "edit" | "delete";

const EDITABLE_SUBMITTED_STATUSES = new Set([
  "pending",
  "approved",
  "rejected",
]);

export function isSubmittedTemplateEditable(status: string) {
  return EDITABLE_SUBMITTED_STATUSES.has(status.toLowerCase());
}

export function getTemplateActions(status: string): TemplateAction[] {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === "draft") return ["edit", "delete"];
  if (isSubmittedTemplateEditable(normalizedStatus)) {
    return ["view", "edit", "delete"];
  }
  return ["view"];
}

export function getTemplateEditorAccess(
  status?: string | null,
  editSubmitted = false,
) {
  const isSubmitted = !!status && status.toLowerCase() !== "draft";
  return {
    isSubmitted,
    isReadOnly: isSubmitted && !editSubmitted,
    lockIdentity: isSubmitted,
  };
}

export function getInitialTemplateEditorStep(
  status?: string | null,
  editSubmitted = false,
): TemplateEditorStep {
  return status && status !== "draft" && !editSubmitted ? 3 : 1;
}

export function isTemplateWorkspacePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  return (
    /^\/templates(?:\/[^/]+(?:\/edit)?)?$/.test(normalizedPath) ||
    /^\/integrations\/whatsapp\/[^/]+\/templates(?:\/[^/]+(?:\/edit)?)?$/.test(
      normalizedPath,
    )
  );
}

export function getTemplateVariableIndexes(text: string) {
  const indexes = new Set<number>();
  for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    indexes.add(Number(match[1]));
  }
  return [...indexes].sort((left, right) => left - right);
}

export function removeTemplateBodyVariable(
  body: string,
  bodySamples: string[],
  variableIndex: number,
) {
  const indexes = getTemplateVariableIndexes(body);
  const sampleIndex = indexes.indexOf(variableIndex);
  if (sampleIndex === -1) return { body, bodySamples: [...bodySamples] };

  const selectedVariable = `\\{\\{\\s*${variableIndex}\\s*\\}\\}`;
  const remainingBody = body
    .replace(
      new RegExp(`[ \\t]*${selectedVariable}[ \\t]*(?=[,.;:!?])`, "g"),
      "",
    )
    .replace(
      new RegExp(`([ \\t]*)${selectedVariable}([ \\t]*)`, "g"),
      (_, leftSpacing: string, rightSpacing: string) =>
        leftSpacing && rightSpacing ? " " : "",
    );
  const renumberedBody = remainingBody.replace(
    /\{\{\s*(\d+)\s*\}\}/g,
    (_, rawIndex: string) => {
      const index = Number(rawIndex);
      return `{{${index > variableIndex ? index - 1 : index}}}`;
    },
  );

  return {
    body: renumberedBody,
    bodySamples: bodySamples.filter((_, index) => index !== sampleIndex),
  };
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
  const headerIndexes =
    values.headerFormat === "TEXT"
      ? getTemplateVariableIndexes(values.header)
      : [];
  const bodyIndexes = getTemplateVariableIndexes(values.body);
  const trimmedBody = values.body.trim();

  if (!trimmedBody) errors.push("Agregá el cuerpo del mensaje.");
  if (values.headerFormat === "TEXT" && values.header.length > 60)
    errors.push("Mantené el encabezado dentro de 60 caracteres.");
  if (values.body.length > 1024)
    errors.push("Mantené el cuerpo dentro de 1.024 caracteres.");
  if (values.footer.length > 60)
    errors.push("Mantené el pie dentro de 60 caracteres.");
  if (
    values.headerFormat === "TEXT" &&
    (!variablesAreSequential(headerIndexes) || headerIndexes.length > 1)
  ) {
    errors.push("El encabezado solo puede usar {{1}}.");
  }
  if (
    values.headerFormat === "TEXT" &&
    headerIndexes.length &&
    !values.headerSample.trim()
  ) {
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
  if (
    values.category === "AUTHENTICATION" &&
    ["IMAGE", "VIDEO", "DOCUMENT"].includes(values.headerFormat)
  ) {
    errors.push("Las plantillas de autenticaciÃ³n no admiten encabezados multimedia.");
  }
  return errors;
}

const MEDIA_FILE_RULES = {
  IMAGE: {
    types: ["image/jpeg", "image/png"],
    extensions: ["jpg", "jpeg", "png"],
    maxSize: 5 * 1024 * 1024,
  },
  VIDEO: {
    types: ["video/mp4"],
    extensions: ["mp4"],
    maxSize: 16 * 1024 * 1024,
  },
  DOCUMENT: {
    types: ["application/pdf"],
    extensions: ["pdf"],
    maxSize: 50 * 1024 * 1024,
  },
} as const;

export function isMediaHeaderFormat(
  format: TemplateHeaderFormat,
): format is MediaHeaderFormat {
  return format === "IMAGE" || format === "VIDEO" || format === "DOCUMENT";
}

export function getTemplateMediaFileError(
  format: TemplateHeaderFormat,
  file?: File,
) {
  if (!isMediaHeaderFormat(format)) return null;
  if (!file) return "SeleccionÃ¡ un archivo de muestra para el encabezado.";

  const rule = MEDIA_FILE_RULES[format];
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (
    !(rule.types as readonly string[]).includes(file.type) ||
    !(rule.extensions as readonly string[]).includes(extension)
  ) {
    return format === "IMAGE"
      ? "La imagen debe ser JPEG o PNG."
      : format === "VIDEO"
        ? "El video debe ser MP4."
        : "El documento debe ser PDF.";
  }
  if (file.size > rule.maxSize) {
    const maxSize = { IMAGE: 5, VIDEO: 16, DOCUMENT: 50 }[format];
    return `El archivo debe pesar ${maxSize} MB o menos.`;
  }
  return null;
}

export function buildTemplateDraftInput(
  values: TemplateEditorValues,
): TemplateDraftInput {
  const headerIndexes = getTemplateVariableIndexes(values.header);
  const bodyIndexes = getTemplateVariableIndexes(values.body);
  const components: TemplateComponent[] = [];

  if (values.headerFormat === "TEXT" && values.header.trim()) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: values.header.trim(),
      ...(headerIndexes.length
        ? { example: { header_text: [values.headerSample.trim()] } }
        : {}),
    });
  }

  if (isMediaHeaderFormat(values.headerFormat)) {
    components.push({ type: "HEADER", format: values.headerFormat });
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
