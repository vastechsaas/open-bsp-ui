import type { ChatbotFlowValidationIssue } from "./ChatbotFlowUtils";

export type ChatbotSimulationMessage = {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
};

export type ChatbotSimulationSession = {
  currentNodeId?: string;
  variables: Record<string, unknown>;
  status: "idle" | "waiting" | "completed" | "failed" | "invalid";
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
      status: "waiting" | "completed" | "failed";
      current_node_id: string;
      waiting_for: "free_text" | null;
      variables: Record<string, unknown>;
      outgoing_texts: string[];
      error: { code: string; message: string } | null;
      transition_count: number;
    };

export function createChatbotSimulationSession(): ChatbotSimulationSession {
  return {
    variables: {},
    status: "idle",
    messages: [],
    issues: [],
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
      issues: step.issues,
    };
  }

  const botMessages = step.outgoing_texts.map((text, index) => ({
    id: `simulation-message-${session.messages.length + index + 1}`,
    role: "bot" as const,
    text,
  }));
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
    variables: step.variables,
    status: step.status,
    messages: [...session.messages, ...botMessages, ...failureMessage],
    issues: [],
  };
}
