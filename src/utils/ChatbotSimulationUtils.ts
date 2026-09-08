import type { ChatbotFlowValidationIssue } from "./ChatbotFlowUtils";

export type ChatbotSimulationMessage = {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
  options?: ChatbotSimulationOption[];
  list?: ChatbotSimulationList;
};

export type ChatbotSimulationOption = {
  id: string;
  title: string;
  description?: string;
  kind: "button" | "list_selection";
};

export type ChatbotSimulationList = {
  buttonText: string;
  sections: Array<{
    title: string;
    options: ChatbotSimulationOption[];
  }>;
};

export type ChatbotSimulationSession = {
  currentNodeId?: string;
  handoffAgentId?: string;
  variables: Record<string, unknown>;
  status:
    | "idle"
    | "waiting"
    | "completed"
    | "handed_off"
    | "failed"
    | "invalid";
  waitingFor: "free_text" | "button" | "list_selection" | null;
  messages: ChatbotSimulationMessage[];
  issues: ChatbotFlowValidationIssue[];
};

export type ChatbotSimulationStep =
  | {
      valid: false;
      issues: ChatbotFlowValidationIssue[];
    }
  | {
      valid: true;
      status: "waiting" | "completed" | "handed_off" | "failed";
      current_node_id: string;
      waiting_for: "free_text" | "button" | "list_selection" | null;
      handoff_agent_id?: string | null;
      variables: Record<string, unknown>;
      outgoing_texts: string[];
      outgoing_messages: Array<
        | { type: "text"; text: string }
        | {
            type: "interactive";
            interactive:
              | {
                  type: "button";
                  body: { text: string };
                  action: {
                    buttons: Array<{
                      type: "reply";
                      reply: { id: string; title: string };
                    }>;
                  };
                }
              | {
                  type: "list";
                  body: { text: string };
                  action: {
                    button: string;
                    sections: Array<{
                      title: string;
                      rows: Array<{
                        id: string;
                        title: string;
                        description?: string;
                      }>;
                    }>;
                  };
                };
          }
      >;
      error: { code: string; message: string } | null;
      transition_count: number;
    };

export function createChatbotSimulationSession(): ChatbotSimulationSession {
  return {
    variables: {},
    status: "idle",
    waitingFor: null,
    messages: [],
    issues: [],
  };
}

export function appendChatbotSimulationOption(
  session: ChatbotSimulationSession,
  option: ChatbotSimulationOption,
): ChatbotSimulationSession {
  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: `simulation-message-${session.messages.length + 1}`,
        role: "user",
        text: option.title,
      },
    ],
  };
}

export function appendChatbotSimulationInput(
  session: ChatbotSimulationSession,
  text: string,
): ChatbotSimulationSession {
  const normalized = text.trim();
  if (!normalized) return session;

  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: `simulation-message-${session.messages.length + 1}`,
        role: "user",
        text: normalized,
      },
    ],
  };
}

export function applyChatbotSimulationStep(
  session: ChatbotSimulationSession,
  step: ChatbotSimulationStep,
): ChatbotSimulationSession {
  if (!step.valid) {
    return {
      ...session,
      status: "invalid",
      waitingFor: null,
      issues: step.issues,
    };
  }

  const botMessages = step.outgoing_messages.map((message, index) => {
    if (message.type === "text") {
      return {
        id: `simulation-message-${session.messages.length + index + 1}`,
        role: "bot" as const,
        text: message.text,
      };
    }

    const interactive = message.interactive;
    if (interactive.type === "button") {
      return {
        id: `simulation-message-${session.messages.length + index + 1}`,
        role: "bot" as const,
        text: interactive.body.text,
        options: interactive.action.buttons.map((button) => ({
          id: button.reply.id,
          title: button.reply.title,
          kind: "button" as const,
        })),
      };
    }

    return {
      id: `simulation-message-${session.messages.length + index + 1}`,
      role: "bot" as const,
      text: interactive.body.text,
      list: {
        buttonText: interactive.action.button,
        sections: interactive.action.sections.map((section) => ({
          title: section.title,
          options: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            kind: "list_selection" as const,
          })),
        })),
      },
    };
  });
  const failureMessage = step.error
    ? [
        {
          id: `simulation-message-${
            session.messages.length + botMessages.length + 1
          }`,
          role: "system" as const,
          text: step.error.message,
        },
      ]
    : [];

  return {
    currentNodeId: step.current_node_id,
    handoffAgentId: step.handoff_agent_id ?? undefined,
    variables: step.variables,
    status: step.status,
    waitingFor: step.waiting_for,
    messages: [...session.messages, ...botMessages, ...failureMessage],
    issues: [],
  };
}
