import { ArrowLeft, Check, LoaderCircle, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";

export default function CampaignWorkspaceHeader({
  title,
  activeStep,
  onBack,
  onDelete,
  deleteLoading = false,
}: {
  title: string;
  activeStep: 1 | 2;
  onBack?: () => void;
  onDelete?: () => void;
  deleteLoading?: boolean;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border px-[20px] md:px-[32px] py-[18px] bg-background text-foreground shrink-0">
      <div className="flex items-center gap-[12px]">
        <button
          className="p-[8px] ml-[-8px] rounded-full hover:bg-muted"
          title={t("Volver")}
          onClick={onBack || (() => void navigate({ to: "/campaigns" }))}
        >
          <ArrowLeft className="w-[22px] h-[22px]" />
        </button>
        <h1 className="text-[22px] font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-[8px]">
          <button
            className="text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => void navigate({ to: "/campaigns" })}
          >
            {t("Volver a campañas")}
          </button>
          {onDelete && (
            <button
              type="button"
              className="rounded-full p-[8px] hover:bg-muted disabled:opacity-50"
              title={t("Eliminar")}
              disabled={deleteLoading}
              onClick={onDelete}
            >
              {deleteLoading ? (
                <LoaderCircle className="h-[20px] w-[20px] animate-spin" />
              ) : (
                <Trash2 className="h-[20px] w-[20px]" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-[18px] mx-auto flex max-w-[680px] items-center">
        <Step number={1} label={t("Configuración")} active={activeStep === 1} />
        <div
          className={`h-px flex-1 mx-[16px] ${activeStep === 2 ? "bg-primary" : "bg-border"}`}
        />
        <Step
          number={2}
          label={t("Revisar y ejecutar")}
          active={activeStep === 2}
          complete={activeStep === 2}
        />
      </div>
    </header>
  );
}

function Step({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active: boolean;
  complete?: boolean;
}) {
  return (
    <div className="flex items-center gap-[8px] shrink-0">
      <div
        className={`w-[28px] h-[28px] rounded-full border flex items-center justify-center text-[13px] ${
          active
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border text-muted-foreground"
        }`}
      >
        {complete ? <Check className="w-[15px] h-[15px]" /> : number}
      </div>
      <span
        className={`text-[13px] ${active ? "font-medium" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}
