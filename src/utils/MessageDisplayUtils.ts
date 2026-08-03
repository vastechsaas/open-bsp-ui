import type { Json } from "@/supabase/db_types";

type StructuredContent = {
  type: "data";
  kind: string;
  data: Json;
  text?: string;
};

type MessageContent =
  | StructuredContent
  | { type: "text"; text: string }
  | { type: "file" }
  | { type: "parts" };

export type InteractiveReplyButton = {
  id: string;
  title: string;
};

export type InteractiveListRow = InteractiveReplyButton & {
  description?: string;
};

export type InteractiveListSection = {
  title: string;
  rows: InteractiveListRow[];
};

export type StructuredMessageDisplay =
  | { kind: "text"; text: string }
  | {
      kind: "interactive_buttons";
      body: string;
      buttons: InteractiveReplyButton[];
    }
  | {
      kind: "interactive_list";
      body: string;
      buttonText: string;
      sections: InteractiveListSection[];
    }
  | { kind: "selected_reply"; text: string }
  | { kind: "media_placeholder" }
  | { kind: "json"; data: Json };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeReplyButtons(
  value: unknown,
): InteractiveReplyButton[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const buttons = value.map((item) => {
    if (!isRecord(item) || item.type !== "reply" || !isRecord(item.reply)) {
      return null;
    }

    const id = readString(item.reply.id);
    const title = readString(item.reply.title);
    return id && title ? { id, title } : null;
  });

  return buttons.every((button) => button !== null)
    ? (buttons as InteractiveReplyButton[])
    : null;
}

function normalizeListSections(
  value: unknown,
): InteractiveListSection[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const sections = value.map((item) => {
    if (
      !isRecord(item) ||
      !Array.isArray(item.rows) ||
      item.rows.length === 0
    ) {
      return null;
    }

    const title = readString(item.title);
    const rows = item.rows.map((row) => {
      if (!isRecord(row)) return null;

      const id = readString(row.id);
      const rowTitle = readString(row.title);
      const description =
        row.description === undefined || row.description === ""
          ? undefined
          : readString(row.description);

      if (!id || !rowTitle || description === null) return null;
      return { id, title: rowTitle, description };
    });

    return title && rows.every((row) => row !== null)
      ? { title, rows: rows as InteractiveListRow[] }
      : null;
  });

  return sections.every((section) => section !== null)
    ? (sections as InteractiveListSection[])
    : null;
}

function normalizeInteractive(data: Json): StructuredMessageDisplay | null {
  if (!isRecord(data)) return null;

  if (data.type === "button") {
    if (!isRecord(data.body) || !isRecord(data.action)) return null;

    const body = readString(data.body.text);
    const buttons = normalizeReplyButtons(data.action.buttons);
    return body && buttons
      ? { kind: "interactive_buttons", body, buttons }
      : null;
  }

  if (data.type === "list") {
    if (!isRecord(data.body) || !isRecord(data.action)) return null;

    const body = readString(data.body.text);
    const buttonText = readString(data.action.button);
    const sections = normalizeListSections(data.action.sections);
    return body && buttonText && sections
      ? { kind: "interactive_list", body, buttonText, sections }
      : null;
  }

  if (data.type === "button_reply" && isRecord(data.button_reply)) {
    const text = readString(data.button_reply.title);
    return text ? { kind: "selected_reply", text } : null;
  }

  if (data.type === "list_reply" && isRecord(data.list_reply)) {
    const text = readString(data.list_reply.title);
    return text ? { kind: "selected_reply", text } : null;
  }

  return null;
}

export function normalizeStructuredMessage(
  content: StructuredContent,
): StructuredMessageDisplay {
  if (typeof content.text === "string" && content.text.length > 0) {
    return { kind: "text", text: content.text };
  }

  if (content.kind === "media_placeholder") {
    return { kind: "media_placeholder" };
  }

  if (content.kind === "interactive") {
    return (
      normalizeInteractive(content.data) ?? { kind: "json", data: content.data }
    );
  }

  if (content.kind === "button" && isRecord(content.data)) {
    const text = readString(content.data.text);
    if (text) return { kind: "selected_reply", text };
  }

  return { kind: "json", data: content.data };
}

export function getMessagePreviewText(
  content: MessageContent,
): string | undefined {
  if (content.type === "text") return content.text;
  if (content.type === "file") return undefined;
  if (content.type !== "data") return undefined;

  const display = normalizeStructuredMessage(content);
  if (display.kind === "text" || display.kind === "selected_reply") {
    return display.text;
  }
  if (
    display.kind === "interactive_buttons" ||
    display.kind === "interactive_list"
  ) {
    return display.body;
  }
  if (display.kind === "json") return JSON.stringify(display.data);
  return undefined;
}
