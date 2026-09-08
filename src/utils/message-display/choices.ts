import type {
  InteractiveListRow,
  InteractiveListSection,
  InteractiveReplyButton,
  StructuredMessageDisplay,
} from "./types";
import { isRecord, readInteractiveFrame, readString } from "./guards";

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

export function normalizeChoiceInteractive(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  if (data.type === "button") {
    const frame = readInteractiveFrame(data);
    if (!frame?.body || !isRecord(data.action)) return null;

    const buttons = normalizeReplyButtons(data.action.buttons);
    return buttons
      ? {
          ...frame,
          kind: "interactive_buttons",
          body: frame.body,
          buttons,
          preview: { kind: "content", text: frame.body },
        }
      : null;
  }

  if (data.type === "list") {
    const frame = readInteractiveFrame(data);
    if (!frame?.body || !isRecord(data.action)) return null;

    const buttonText = readString(data.action.button);
    const sections = normalizeListSections(data.action.sections);
    return buttonText && sections
      ? {
          ...frame,
          kind: "interactive_list",
          body: frame.body,
          buttonText,
          sections,
          preview: { kind: "content", text: frame.body },
        }
      : null;
  }

  if (data.type === "button_reply" && isRecord(data.button_reply)) {
    const text = readString(data.button_reply.title);
    return text
      ? {
          kind: "selected_reply",
          text,
          preview: { kind: "content", text },
        }
      : null;
  }

  if (data.type === "list_reply" && isRecord(data.list_reply)) {
    const text = readString(data.list_reply.title);
    return text
      ? {
          kind: "selected_reply",
          text,
          preview: { kind: "content", text },
        }
      : null;
  }

  return null;
}
