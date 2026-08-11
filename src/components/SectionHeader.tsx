import { ArrowLeft, Trash2, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocation, useRouter } from "@tanstack/react-router";
import { LinkButton } from "./LinkButton";
import Spinner from "./Spinner";

export default function SectionHeader({
  title,
  closeButton,
  backTo,
  onDelete,
  deleteDisabled,
  deleteDisabledReason,
  deleteLoading,
  hideBackButton = false,
}: {
  title: string;
  closeButton?: boolean;
  backTo?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  deleteLoading?: boolean;
  hideBackButton?: boolean;
}) {
  const { translate: t } = useTranslation();
  const location = useLocation();
  const router = useRouter();

  const showBackButton =
    !hideBackButton && location.pathname.split("/").filter(Boolean).length >= 2;

  return (
    <div className="header items-center truncate">
      {/* Back button */}
      {showBackButton &&
        (closeButton ? (
          <button
            className="p-[8px] rounded-full hover:bg-muted mr-[8px] ml-[-8px]"
            title={t("Cerrar")}
            onClick={() => router.history.back()}
          >
            <X className="w-[24px] h-[24px]" />
          </button>
        ) : (
          <LinkButton
            to={backTo || ".."}
            className="mr-[8px] ml-[-8px]"
            title={t("Volver")}
          >
            <ArrowLeft className="w-[24px] h-[24px]" />
          </LinkButton>
        ))}

      {/* Section title */}
      <div className={showBackButton ? "text-[16px]" : "text-[22px]"}>
        {t(title)}
      </div>

      {onDelete && (
        <button
          className="p-[8px] rounded-full hover:bg-muted ml-auto disabled:opacity-30 disabled:hover:bg-transparent"
          title={
            deleteDisabled && deleteDisabledReason
              ? `${t("Eliminar")} - ${deleteDisabledReason}`
              : t("Eliminar")
          }
          onClick={onDelete}
          disabled={deleteDisabled || deleteLoading}
        >
          {deleteLoading ? (
            <Spinner size={24} />
          ) : (
            <Trash2 className="w-[24px] h-[24px]" />
          )}
        </button>
      )}
    </div>
  );
}
