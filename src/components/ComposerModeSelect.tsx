import { useState } from "react";
import { Dropdown } from "antd";
import { ChevronDown, MessageSquareText, StickyNote } from "lucide-react";

/** Shared inline mode control; selecting a mode never sends or clears a draft. */
export default function ComposerModeSelect({
  privateNoteMode,
  onChange,
  translate: t,
}: {
  privateNoteMode: boolean;
  onChange: (privateNoteMode: boolean) => void;
  translate: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = privateNoteMode ? StickyNote : MessageSquareText;
  const label = privateNoteMode ? t("Nota privada") : t("Responder");

  return (
    <Dropdown
      trigger={["click"]}
      placement="topLeft"
      open={open}
      onOpenChange={setOpen}
      menu={{
        selectable: true,
        selectedKeys: [privateNoteMode ? "note" : "reply"],
        items: [
          {
            key: "reply",
            icon: <MessageSquareText className="h-4 w-4" aria-hidden />,
            label: t("Responder al cliente"),
          },
          {
            key: "note",
            icon: (
              <StickyNote
                className="h-4 w-4 text-amber-600 dark:text-amber-300"
                aria-hidden
              />
            ),
            label: t("Nota privada"),
          },
        ],
        onClick: ({ key }) => {
          onChange(key === "note");
          setOpen(false);
        },
      }}
    >
      <button
        type="button"
        aria-label={`${t("Modo de mensaje")}: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          privateNoteMode
            ? "text-amber-900 hover:bg-amber-200 dark:text-amber-100 dark:hover:bg-amber-900"
            : "text-foreground hover:bg-accent"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
    </Dropdown>
  );
}
