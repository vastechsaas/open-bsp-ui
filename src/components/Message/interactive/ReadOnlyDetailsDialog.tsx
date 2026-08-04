import { X } from "lucide-react";
import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export function ReadOnlyActionRow({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex w-full items-center justify-center gap-[7px] border-t border-border py-3 text-center text-primary"
    >
      {icon}
      {label}
    </div>
  );
}

export function ReadOnlyDetailsDialog({
  triggerIcon,
  triggerLabel,
  title,
  closeLabel,
  children,
}: PropsWithChildren<{
  triggerIcon: ReactNode;
  triggerLabel: string;
  title: string;
  closeLabel: string;
}>) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="flex w-full items-center justify-center gap-[7px] border-t border-border py-3 text-center text-primary hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary dark:hover:bg-white/5"
        onClick={() => setOpen(true)}
      >
        {triggerIcon}
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[80vh] w-full max-w-[480px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div id={titleId} className="min-w-0 flex-1 font-semibold">
                {title}
              </div>
              <button
                ref={closeRef}
                type="button"
                title={closeLabel}
                aria-label={closeLabel}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(80vh-57px)] overflow-y-auto p-3">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
