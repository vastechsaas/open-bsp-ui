import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type CampaignFilterOption<T extends string> = {
  label: string;
  value: T;
};

export default function CampaignFilterSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className = "",
}: {
  ariaLabel: string;
  value: T;
  options: CampaignFilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-[40px] w-full rounded-lg border border-input bg-background px-[12px] flex items-center justify-between gap-[10px] text-[14px] text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`w-[16px] h-[16px] shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-lg border border-border bg-popover text-popover-foreground p-[5px] shadow-xl"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`w-full rounded-md px-[10px] py-[9px] flex items-center justify-between gap-[10px] text-left text-[13px] ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-popover-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="w-[15px] h-[15px] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
