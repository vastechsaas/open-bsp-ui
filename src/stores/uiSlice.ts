import type { StateCreator } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { AppState } from "./useBoundStore";
import dayjs from "dayjs";
import type {
  ConversationRow,
  MessageRow,
  TemplateData,
} from "@/supabase/client";
import {
  DEFAULT_CONVERSATION_QUEUE_KEY,
  type ConversationQueueKey,
} from "@/types/conversationQueues";

export function isArchived(conv: ConversationRow, msg?: MessageRow) {
  const archivedTimestamp: string | null | undefined = conv.extra?.archived;

  return +new Date(archivedTimestamp || 0) > +new Date(msg?.timestamp || 0);
}

export const Filters = {
  ALL: "todas",
  MINE: "mías",
  UNASSIGNED: "sin asignar",
  UNREAD: "pendientes",
  H24: "24h",
  ARCHIVED: "archivadas",
} as const;

export type Filters = (typeof Filters)[keyof typeof Filters];

export type FilterContext = {
  currentAgentId?: string | null;
  role?: string | null;
};

export const filters: {
  [key in Filters]: (
    conv: ConversationRow,
    msg?: MessageRow,
    context?: FilterContext,
  ) => boolean;
} = {
  todas: (conv, msg) => !isArchived(conv, msg),
  mías: (conv, msg, context) =>
    !isArchived(conv, msg) &&
    !!context?.currentAgentId &&
    conv.assigned_agent_id === context.currentAgentId,
  "sin asignar": (conv, msg) =>
    !isArchived(conv, msg) && conv.assigned_agent_id === null,
  pendientes: (conv, msg) =>
    !isArchived(conv, msg) && msg?.direction === "incoming",
  "24h": (conv, msg) =>
    !isArchived(conv, msg) &&
    dayjs(msg?.timestamp || 0).isAfter(dayjs().subtract(1, "day")),
  archivadas: (conv, msg) => isArchived(conv, msg),
} as const;

function getLatestIncomingMessage(
  messages: MessageRow[] | undefined,
): MessageRow | undefined {
  return messages
    ?.filter((message) => message.direction === "incoming")
    .sort(
      (a, b) =>
        +new Date(b.timestamp || 0) - +new Date(a.timestamp || 0) ||
        (b.id || "").localeCompare(a.id || ""),
    )[0];
}

export const conversationQueueFilters: {
  [key in ConversationQueueKey]: (
    conv: ConversationRow,
    messages?: MessageRow[],
    context?: FilterContext,
  ) => boolean;
} = {
  all_active: (conv) => conv.status === "active",
  assigned: (conv, _messages, context) =>
    conv.status === "active" &&
    (context?.role === "agent"
      ? !!context.currentAgentId &&
        conv.assigned_agent_id === context.currentAgentId
      : conv.assigned_agent_id !== null),
  pending: (conv) =>
    conv.status === "active" && conv.assigned_agent_id === null,
  // Mentioned is intentionally resolved by its tenant-safe paginated RPC.
  mentioned: () => false,
  spam: (conv) => conv.status === "spam",
  closed: (conv) => conv.status === "closed",
  expired: (conv, messages) => {
    const latestIncoming = getLatestIncomingMessage(messages);

    return (
      conv.status === "active" &&
      !!latestIncoming &&
      !dayjs(latestIncoming.timestamp).isAfter(dayjs().subtract(24, "hour"))
    );
  },
} as const;

export type TemplateDraft = {
  template: TemplateData;
  bodyVarValues: string[];
  headVarValues: string[];
};

export type Language = "es" | "en" | "pt" | "sw" | "fr";

const SUPPORTED_LANGUAGES: Language[] = ["es", "en", "pt", "sw", "fr"];

export function detectDefaultLanguage(): Language {
  const candidates =
    typeof navigator !== "undefined"
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : [];

  for (const tag of candidates) {
    const base = tag.toLowerCase().split("-")[0] as Language;
    if (SUPPORTED_LANGUAGES.includes(base)) return base;
  }

  return "en";
}

export type UIState = {
  templatePicker: boolean;
  privateNoteMode: boolean;
  templateDrafts: Map<string, TemplateDraft>;
  activeOrgId: string | null;
  activeConvId: string | null;
  user: User | null;
  sendAsContact: boolean;
  filter: keyof typeof filters;
  conversationQueueKey: ConversationQueueKey;
  routingQueueId: string | null;
  searchPattern: string;
  isLoading: boolean;
  language: Language;
  sidebarCollapsed: boolean;
};

export type UIActions = {
  toggle: (component: keyof UIState, value?: boolean) => void;
  setActiveOrg: (id: string | null) => void;
  setActiveConv: (id: string | null) => void;
  setUser: (user: User | null) => void;
  setSendAsContact: (sendAsContact: boolean) => void;
  setPrivateNoteMode: (privateNoteMode: boolean) => void;
  setFilter: (filter: keyof typeof filters) => void;
  setConversationQueueKey: (queueKey: ConversationQueueKey) => void;
  setRoutingQueueId: (routingQueueId: string | null) => void;
  setSearchPattern: (searchPattern: string) => void;
  setTemplateDraft: (convId: string, draft: TemplateDraft | null) => void;
  setLanguage: (lang: Language) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

export type UISlice = UIState & UIActions;

// @ts-expect-error partializing the slice creator's state type
export const createUISlice: StateCreator<Partial<AppState>> = (
  set: (
    partial:
      | AppState
      | Partial<AppState>
      | ((state: AppState) => AppState | Partial<AppState>),
    replace?: boolean,
  ) => void,
) => ({
  templatePicker: false,
  privateNoteMode: false,
  templateDrafts: new Map(),
  activeOrgId: null,
  activeConvId: null,
  user: null,
  sendAsContact: false,
  filter: "todas" as keyof typeof filters,
  conversationQueueKey: DEFAULT_CONVERSATION_QUEUE_KEY,
  routingQueueId: null,
  searchPattern: "",
  isLoading: false,
  language: detectDefaultLanguage(),
  sidebarCollapsed: false,
  toggle: (component: keyof UIState, value?: boolean) =>
    set((state) => ({
      ui: {
        ...state.ui,
        [component]: value ?? !state.ui[component],
      },
    })),
  setActiveOrg: (activeOrgId: string | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        activeOrgId,
        routingQueueId: null,
      },
    })),
  setSidebarCollapsed: (sidebarCollapsed: boolean) =>
    set((state) => ({
      ui: {
        ...state.ui,
        sidebarCollapsed,
      },
    })),
  setActiveConv: (activeConvId: string | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        activeConvId,
      },
    })),
  setUser: (user: User | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        user,
      },
    })),
  setSendAsContact: (sendAsContact: boolean) =>
    set((state) => ({
      ui: {
        ...state.ui,
        sendAsContact,
      },
    })),
  setPrivateNoteMode: (privateNoteMode: boolean) =>
    set((state) => ({
      ui: {
        ...state.ui,
        privateNoteMode,
        templatePicker: privateNoteMode ? false : state.ui.templatePicker,
      },
    })),
  setFilter: (filter: keyof typeof filters) =>
    set((state) => ({
      ui: {
        ...state.ui,
        filter,
      },
    })),
  setConversationQueueKey: (conversationQueueKey: ConversationQueueKey) =>
    set((state) => ({
      ui: {
        ...state.ui,
        conversationQueueKey,
      },
    })),
  setRoutingQueueId: (routingQueueId: string | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        routingQueueId,
      },
    })),
  setSearchPattern: (searchPattern: string) =>
    set((state) => ({
      ui: {
        ...state.ui,
        searchPattern,
      },
    })),
  setTemplateDraft: (convId: string, draft: TemplateDraft | null) =>
    set((state) => {
      const templateDrafts = new Map(state.ui.templateDrafts);
      if (draft) {
        templateDrafts.set(convId, draft);
      } else {
        templateDrafts.delete(convId);
      }
      return { ui: { ...state.ui, templateDrafts } };
    }),
  setLanguage: (language: Language) =>
    set((state) => ({
      ui: { ...state.ui, language },
    })),
});
