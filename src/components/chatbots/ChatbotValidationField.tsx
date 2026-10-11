import {
  cloneElement,
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
  type AriaAttributes,
} from "react";
import {
  chatbotValidationIssueKey,
  formatChatbotValidationIssue,
  getChatbotValidationFieldPath,
  type ChatbotFlowValidationIssue,
} from "@/utils/ChatbotFlowUtils";

const DiagnosticContext = createContext<{
  issues: ChatbotFlowValidationIssue[];
  translate: (text: string) => string;
}>({ issues: [], translate: (text) => text });

export function ChatbotValidationFields({
  issues,
  children,
  translate = (text) => text,
}: {
  issues: ChatbotFlowValidationIssue[];
  children: ReactNode;
  translate?: (text: string) => string;
}) {
  return (
    <DiagnosticContext.Provider value={{ issues, translate }}>
      {children}
    </DiagnosticContext.Provider>
  );
}

/** One field path is shared by inline errors and exact inspector navigation. */
export function ChatbotValidationField({
  path,
  children,
  counter = false,
}: {
  path: Array<string | number>;
  counter?: boolean;
  children: ReactElement<{
    className?: string;
    "aria-invalid"?: AriaAttributes["aria-invalid"];
    value?: unknown;
    maxLength?: number;
  }>;
}) {
  const { issues: allIssues, translate: t } = useContext(DiagnosticContext);
  const issues = allIssues.filter(
    (issue) =>
      JSON.stringify(getChatbotValidationFieldPath(issue)) ===
      JSON.stringify(path),
  );
  const length =
    typeof children.props.value === "string" ? children.props.value.length : 0;
  const limit = children.props.maxLength;
  const overLimit = limit !== undefined && length > limit;
  return (
    <span
      className="block min-w-0 flex-1"
      data-validation-path={JSON.stringify(path)}
    >
      {cloneElement(
        children,
        issues.length || overLimit
          ? {
              "aria-invalid": true,
              className: `${children.props.className ?? ""} w-full ring-2 ring-destructive/70`,
            }
          : { className: `${children.props.className ?? ""} w-full` },
      )}
      {counter && limit !== undefined && (
        <span
          className={`mt-1 block text-right text-[9px] ${overLimit ? "text-destructive" : "text-muted-foreground"}`}
        >
          {length}/{limit}
        </span>
      )}
      {issues.map((issue) => (
        <span
          role="alert"
          key={chatbotValidationIssueKey(issue)}
          className="mt-1 block text-[10px] text-destructive"
        >
          {formatChatbotValidationIssue(issue, t)}
        </span>
      ))}
    </span>
  );
}

/** Array-level errors and generated IDs have no editable control of their own. */
export function ChatbotValidationMessages({
  path,
}: {
  path: Array<string | number>;
}) {
  const { issues: allIssues, translate: t } = useContext(DiagnosticContext);
  const issues = allIssues.filter(
    (issue) =>
      JSON.stringify(getChatbotValidationFieldPath(issue)) ===
      JSON.stringify(path),
  );
  return issues.length ? (
    <span
      tabIndex={-1}
      data-validation-path={JSON.stringify(path)}
      className="block rounded border border-destructive/40 p-1"
    >
      {issues.map((issue) => (
        <span
          key={chatbotValidationIssueKey(issue)}
          role="alert"
          className="block text-[10px] text-destructive"
        >
          {formatChatbotValidationIssue(issue, t)}
        </span>
      ))}
    </span>
  ) : null;
}
