import {
  Building2,
  ChevronLeft,
  Globe2,
  Info,
  Mail,
  MapPin,
  MoreVertical,
  Share2,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  pictureUrl?: string;
  verifiedName?: string;
  phoneNumber?: string;
  vertical?: string;
  description?: string;
  address?: string;
  about?: string;
  email?: string;
  websites: string[];
};

export default function WhatsAppBusinessProfilePreview({
  pictureUrl,
  verifiedName,
  phoneNumber,
  vertical,
  description,
  address,
  about,
  email,
  websites,
}: Props) {
  const { translate: t } = useTranslation();
  const details = [
    { icon: Building2, text: vertical, placeholder: t("Sin categoría") },
    {
      icon: Info,
      text: description,
      placeholder: t("Agregar una descripción"),
    },
    { icon: MapPin, text: address, placeholder: t("Agregar una dirección") },
    { icon: Info, text: about, placeholder: t("Agregar información") },
    { icon: Mail, text: email, placeholder: t("Agregar correo electrónico") },
    ...(websites.length
      ? websites.map((website) => ({
          icon: Globe2,
          text: website,
          placeholder: "",
        }))
      : [
          {
            icon: Globe2,
            text: "",
            placeholder: t("Agregar sitio web"),
          },
        ]),
  ];

  return (
    <aside className="mx-auto w-full max-w-[390px]">
      <div className="rounded-[30px] border-4 border-border bg-muted p-3 shadow-xl">
        <div className="overflow-hidden rounded-[22px] bg-card text-card-foreground">
          <div className="flex items-center justify-between p-4 text-muted-foreground">
            <ChevronLeft className="h-5 w-5" />
            <MoreVertical className="h-5 w-5" />
          </div>

          <div className="flex flex-col items-center px-6 pb-6">
            {pictureUrl ? (
              <img
                src={pictureUrl}
                alt={t("Foto del perfil")}
                className="h-24 w-24 rounded-full border-4 border-card object-cover shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-card bg-muted shadow-md">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
            )}

            <div className="mt-3 text-center text-lg font-semibold">
              {verifiedName || t("Nombre comercial")}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {phoneNumber ? `+${phoneNumber.replace(/^\+/, "")}` : ""}
            </div>
            <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/15">
              <Share2 className="h-4 w-4 text-[#25D366]" />
            </div>

            <div className="mt-6 flex w-full flex-col gap-4">
              {details.map(({ icon: Icon, text, placeholder }, index) => (
                <div
                  key={`${text}-${index}`}
                  className="flex items-start gap-3 text-sm"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span
                    className={
                      text ? "break-all" : "italic text-muted-foreground"
                    }
                  >
                    {text || placeholder}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-muted-foreground">
        {t("Vista previa")}
      </div>
    </aside>
  );
}
