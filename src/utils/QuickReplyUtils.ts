import type { OrganizationRole } from "./RoleAccess";

export type QuickReplyCandidate = {
  id: string;
  shortcut: string;
  content: string;
};

export type QuickReplyKeyboardAction =
  | { type: "move"; index: number }
  | { type: "select"; index: number }
  | { type: "close" }
  | { type: "none" };

export function canManageQuickReplies(
  role: OrganizationRole | null | undefined,
) {
  return role === "owner" || role === "admin" || role === "supervisor";
}

export function isQuickRepliesWorkspacePath(pathname: string) {
  return (
    pathname === "/quick-replies" || pathname.startsWith("/quick-replies/")
  );
}

export function normalizeQuickReplyShortcut(shortcut: string) {
  const normalized = shortcut.trim().toLocaleLowerCase();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function validateQuickReplyDraft(shortcut: string, content: string) {
  const normalizedShortcut = normalizeQuickReplyShortcut(shortcut);
  const normalizedContent = content.trim();
  const shortcutValid =
    normalizedShortcut.length >= 2 &&
    normalizedShortcut.length <= 30 &&
    /^\/[a-z0-9_-]+$/.test(normalizedShortcut);
  const contentValid =
    normalizedContent.length >= 1 && normalizedContent.length <= 1000;

  return {
    shortcut: normalizedShortcut,
    content: normalizedContent,
    shortcutValid,
    contentValid,
    valid: shortcutValid && contentValid,
  };
}

export function getQuickReplySuggestions<T extends QuickReplyCandidate>(
  draft: string,
  replies: readonly T[],
) {
  if (!draft.startsWith("/") || draft.includes("\n")) return [];

  const query = draft.slice(1).trim().toLocaleLowerCase();
  return [...replies]
    .filter(
      (reply) =>
        !query ||
        reply.shortcut.slice(1).toLocaleLowerCase().includes(query) ||
        reply.content.toLocaleLowerCase().includes(query),
    )
    .sort((left, right) => left.shortcut.localeCompare(right.shortcut));
}

export function getQuickReplyKeyboardAction(
  key: string,
  selectedIndex: number,
  resultCount: number,
): QuickReplyKeyboardAction {
  if (key === "Escape") return { type: "close" };
  if (resultCount < 1) return { type: "none" };

  if (key === "ArrowDown") {
    return { type: "move", index: (selectedIndex + 1) % resultCount };
  }
  if (key === "ArrowUp") {
    return {
      type: "move",
      index: (selectedIndex - 1 + resultCount) % resultCount,
    };
  }
  if (key === "Enter" || key === "Tab") {
    return {
      type: "select",
      index: Math.min(Math.max(selectedIndex, 0), resultCount - 1),
    };
  }

  return { type: "none" };
}
