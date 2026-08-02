import type { TemplateData } from "@/supabase/client";
import type { MediaHeaderFormat } from "@/supabase/types/whatsapp_template_types";

export type CampaignCsvRecipient = {
  contact_address: string;
  name: string | null;
  variables: Record<string, string>;
};

export type ParsedCampaignCsv = {
  recipients: CampaignCsvRecipient[];
  variableColumns: string[];
};

export type TemplateVariable = {
  key: string;
  section: "header" | "body" | "button";
  index: number;
  buttonIndex?: number;
};

export type CampaignSubmitIntent = "save" | "review";
export type CampaignReadiness =
  | "loading"
  | "ready"
  | "needs_attention"
  | "unavailable";
export type CampaignExecutionStatus =
  | "draft"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export function canStartCampaign(status: string, readiness: CampaignReadiness) {
  return status === "draft" && readiness === "ready";
}

export function isCampaignProcessing(status: string) {
  return status === "queued" || status === "running";
}

export function isCampaignWorkspacePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  return (
    normalizedPath === "/campaigns" ||
    normalizedPath === "/campaigns/new" ||
      /^\/campaigns\/[^/]+\/(?:edit|review)$/.test(normalizedPath)
  );
}

export function isTemplateMappingComplete(
  template: TemplateData | null | undefined,
  mapping: Record<string, unknown>,
) {
  return getTemplateVariables(template).every((variable) => {
    const value = mapping[variable.key];
    return typeof value === "string" && value.length > 0;
  });
}

export function getCampaignReadiness({
  template,
  mapping,
  audienceCount,
  audienceUnavailable = false,
  headerMedia,
  mediaUnavailable = false,
}: {
  template: TemplateData | null | undefined;
  mapping: Record<string, unknown>;
  audienceCount: number | null | undefined;
  audienceUnavailable?: boolean;
  headerMedia?: { format?: string; media_id?: string } | null;
  mediaUnavailable?: boolean;
}): CampaignReadiness {
  if (audienceUnavailable) return "unavailable";
  if (audienceCount === undefined) return "loading";
  const mediaFormat = getTemplateMediaHeaderFormat(template);
  if (
    !template ||
    template.status !== "APPROVED" ||
    !isTemplateMappingComplete(template, mapping) ||
    audienceCount === null ||
    audienceCount <= 0 ||
    (mediaFormat &&
      (!headerMedia ||
        headerMedia.format !== mediaFormat ||
        !headerMedia.media_id)) ||
    mediaUnavailable
  ) {
    return "needs_attention";
  }
  return "ready";
}

export function getTemplateMediaHeaderFormat(
  template: TemplateData | null | undefined,
): MediaHeaderFormat | null {
  if (!template) return null;
  const header = template.components.find(
    (component) => component.type === "HEADER" && component.format !== "TEXT",
  );
  return header?.format ?? null;
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  if (quoted) throw new Error("El archivo CSV tiene comillas sin cerrar");

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

export function parseCampaignCsv(input: string): ParsedCampaignCsv {
  const rows = parseCsvRows(input);
  if (rows.length < 2) {
    throw new Error("El archivo CSV debe incluir encabezados y destinatarios");
  }

  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new Error("El archivo CSV contiene un encabezado vacío");
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error("El archivo CSV contiene encabezados duplicados");
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  const addressIndex = normalizedHeaders.findIndex((header) =>
    [
      "contact_address",
      "phone",
      "phone_number",
      "telefono",
      "whatsapp",
    ].includes(header),
  );
  if (addressIndex === -1) {
    throw new Error(
      "El archivo CSV debe incluir una columna contact_address o phone",
    );
  }

  const nameIndex = normalizedHeaders.findIndex((header) =>
    ["name", "nombre"].includes(header),
  );
  const variableColumns = headers.filter(
    (_, index) => index !== addressIndex && index !== nameIndex,
  );
  const addresses = new Set<string>();

  const recipients = rows.slice(1).map((columns, rowIndex) => {
    const contactAddress = (columns[addressIndex] || "").trim();
    if (!contactAddress) {
      throw new Error(`Falta el teléfono en la fila ${rowIndex + 2}`);
    }
    if (addresses.has(contactAddress)) {
      throw new Error(`El teléfono ${contactAddress} está duplicado`);
    }
    addresses.add(contactAddress);

    return {
      contact_address: contactAddress,
      name: nameIndex === -1 ? null : (columns[nameIndex] || "").trim() || null,
      variables: Object.fromEntries(
        variableColumns.map((header) => {
          const columnIndex = headers.indexOf(header);
          return [header, (columns[columnIndex] || "").trim()];
        }),
      ),
    };
  });

  return { recipients, variableColumns };
}

export function getTemplateVariables(
  template: TemplateData | null | undefined,
): TemplateVariable[] {
  if (!template) return [];

  return template.components.flatMap((component): TemplateVariable[] => {
    if (component.type === "BUTTONS") {
      return component.buttons.flatMap((button, buttonIndex) =>
        button.type === "URL" && button.url.endsWith("{{1}}")
          ? [
              {
                key: `button.${buttonIndex}.1`,
                section: "button" as const,
                index: 1,
                buttonIndex,
              },
            ]
          : [],
      );
    }
    if (component.type !== "HEADER" && component.type !== "BODY") return [];
    if (component.type === "HEADER" && component.format !== "TEXT") return [];
    const matches = [...component.text.matchAll(/{{\s*(\d+)\s*}}/g)];
    const indexes = [...new Set(matches.map((match) => Number(match[1])))];
    const section = component.type === "HEADER" ? "header" : "body";
    return indexes
      .sort((left, right) => left - right)
      .map((index) => ({ key: `${section}.${index}`, section, index }));
  });
}
