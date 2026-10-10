import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { businessHoursTimezones } from "@/utils/BusinessHoursUtils";

export default function BusinessHoursTimezoneSelect({
  value,
  onChange,
  disabled,
  translate: t,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  translate: (label: string) => string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const options = businessHoursTimezones(value, search);

  useEffect(() => {
    if (open)
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active, search]);

  const choose = (zone: string) => {
    onChange(zone);
    setOpen(false);
    setSearch("");
  };

  return (
    <div
      className="relative mb-4 max-w-lg"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="mb-2 block text-sm">
        {t("Zona horaria")}
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && options[active] ? `${id}-${active}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={open ? search : value.replaceAll("_", " ")}
          placeholder={value.replaceAll("_", " ")}
          onFocus={() => {
            setOpen(true);
            setSearch("");
            setActive(0);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                Math.max(
                  0,
                  Math.min(
                    options.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (options[active]) choose(options[active]);
            }
          }}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {t(
          "Busca por ciudad o región. Los horarios y festivos usan esta zona horaria.",
        )}
      </p>
      {open && !disabled && (
        <div
          id={`${id}-options`}
          ref={list}
          role="listbox"
          aria-label={t("Zona horaria")}
          className="absolute left-0 right-0 top-[70px] z-30 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {options.map((zone, index) => (
            <button
              key={zone}
              id={`${id}-${index}`}
              type="button"
              role="option"
              aria-selected={zone === value}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(zone)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${index === active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {zone.replaceAll("_", " ")}
              {zone === value && (
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          ))}
          {!options.length && (
            <p role="status" className="p-3 text-sm text-muted-foreground">
              {t("No se encontraron zonas horarias.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
