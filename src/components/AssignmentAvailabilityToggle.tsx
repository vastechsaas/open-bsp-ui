type Props = {
  available: boolean | null;
  disabled: boolean;
  busy: boolean;
  failed: boolean;
  onToggle: () => void;
  translate: (text: string) => string;
};

export default function AssignmentAvailabilityToggle({
  available,
  disabled,
  busy,
  failed,
  onToggle,
  translate: t,
}: Props) {
  const label =
    available === null
      ? t(failed ? "Estado no disponible" : "Cargando...")
      : t(available ? "Disponible" : "Ausente");
  return (
    <button
      type="button"
      role="switch"
      aria-label={t("Disponibilidad para conversaciones")}
      aria-checked={available === true}
      aria-busy={busy}
      disabled={disabled}
      onClick={onToggle}
      title={label}
      className={`assignment-availability-control relative flex h-[26px] min-w-[96px] shrink-0 items-center rounded-full px-2 text-[11px] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
        available === null
          ? "bg-muted text-muted-foreground"
          : available
            ? "bg-green-700 text-white hover:bg-green-800"
            : "bg-red-700 text-white hover:bg-red-800"
      }`}
    >
      <span
        aria-hidden="true"
        className={`assignment-availability-label flex-1 whitespace-nowrap ${available ? "pr-5" : "pl-5"}`}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`absolute top-1 h-[18px] w-[18px] rounded-full bg-white shadow-sm ${available ? "right-1" : "left-1"}`}
      />
    </button>
  );
}
