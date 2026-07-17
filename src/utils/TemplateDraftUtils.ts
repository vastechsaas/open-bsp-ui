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
  if (!values.organizationAddress) errors.push("Select a WhatsApp account.");
  if (!/^[a-z0-9_]+$/.test(values.name) || values.name.length > 512) {
    errors.push(
      "Use lowercase letters, numbers, and underscores for the name.",
    );
  }
  if (!values.language) errors.push("Select a language.");
  if (!values.category) errors.push("Select a category.");
  return errors;
}

export function getTemplateContentErrors(values: TemplateEditorValues) {
  const errors: string[] = [];
  const headerIndexes = getTemplateVariableIndexes(values.header);
  const bodyIndexes = getTemplateVariableIndexes(values.body);
  const trimmedBody = values.body.trim();

  if (!trimmedBody) errors.push("Add the message body.");
  if (values.header.length > 60)
    errors.push("Keep the header within 60 characters.");
  if (values.body.length > 1024)
    errors.push("Keep the body within 1,024 characters.");
  if (values.footer.length > 60)
    errors.push("Keep the footer within 60 characters.");
  if (!variablesAreSequential(headerIndexes) || headerIndexes.length > 1) {
    errors.push("The header can use only {{1}}.");
  }
  if (headerIndexes.length && !values.headerSample.trim()) {
    errors.push("Add a sample for the header variable.");
  }
  if (!variablesAreSequential(bodyIndexes)) {
    errors.push("Body variables must be sequential from {{1}}.");
  }
  if (/^\{\{\s*\d+\s*\}\}/.test(trimmedBody)) {
    errors.push("The body cannot start with a variable.");
  }
  if (/\{\{\s*\d+\s*\}\}$/.test(trimmedBody)) {
    errors.push("The body cannot end with a variable.");
  }
  if (bodyIndexes.some((_, index) => !values.bodySamples[index]?.trim())) {
    errors.push("Add a sample for every body variable.");
  }
  if (values.quickReplies.length > 3)
    errors.push("Add no more than three quick replies.");
  if (values.quickReplies.some((reply) => !reply.trim() || reply.length > 25)) {
    errors.push("Quick replies must contain 1 to 25 characters.");
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
