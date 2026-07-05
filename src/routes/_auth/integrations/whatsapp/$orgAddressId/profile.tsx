import Button from "@/components/Button";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Spinner from "@/components/Spinner";
import WhatsAppBusinessProfilePreview from "@/components/WhatsAppBusinessProfilePreview";
import { useCurrentAgent } from "@/queries/useAgents";
import { useOrganizationAddress } from "@/queries/useOrganizationsAddresses";
import {
  useWhatsAppProfileSync,
  useWhatsAppProfileUpdate,
} from "@/queries/useWhatsAppProfile";
import type { WhatsAppOrganizationAddressExtra } from "@/supabase/client";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import { useTranslation } from "@/hooks/useTranslation";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Eye,
  ImagePlus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/profile",
)({
  component: WhatsAppBusinessProfile,
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatMessagingLimit(value?: string) {
  if (!value) return "—";
  if (value === "UNLIMITED") return "∞";
  return value.replace("TIER_", "");
}

function WhatsAppBusinessProfile() {
  const { orgAddressId } = Route.useParams();
  const { translate: t } = useTranslation();
  const categories = [
    ["MATRIMONY_SERVICE", t("Servicios matrimoniales")],
    ["AUTO", t("Servicios automotrices")],
    ["BEAUTY", t("Belleza y cuidado personal")],
    ["APPAREL", t("Ropa y accesorios")],
    ["EDU", t("Educación")],
    ["ENTERTAIN", t("Entretenimiento")],
    ["EVENT_PLAN", t("Organización de eventos")],
    ["FINANCE", t("Finanzas")],
    ["GROCERY", t("Supermercado")],
    ["GOVT", t("Gobierno")],
    ["HOTEL", t("Hotelería")],
    ["HEALTH", t("Salud")],
    ["NONPROFIT", t("Organización sin fines de lucro")],
    ["PROF_SERVICES", t("Servicios profesionales")],
    ["RETAIL", t("Comercio minorista")],
    ["TRAVEL", t("Viajes y transporte")],
    ["RESTAURANT", t("Restaurante")],
    ["OTHER", t("Otro")],
  ] as const;
  const { data: integration, isLoading } = useOrganizationAddress(orgAddressId);
  const { data: agent } = useCurrentAgent();
  const syncProfile = useWhatsAppProfileSync();
  const updateProfile = useWhatsAppProfileUpdate();
  const autoSyncKey = useRef<string | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);

  const canManage = ["admin", "owner"].includes(agent?.extra?.role || "");
  const extra = integration?.extra as
    | WhatsAppOrganizationAddressExtra
    | undefined;
  const cachedProfile = extra?.business_profile;

  const [vertical, setVertical] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [email, setEmail] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState<{
    type: "error" | "success";
    text: string;
  }>();

  useEffect(() => {
    setVertical(cachedProfile?.vertical || "");
    setDescription(cachedProfile?.description || "");
    setAddress(cachedProfile?.address || "");
    setAbout(cachedProfile?.about || "");
    setEmail(cachedProfile?.email || "");
    setWebsites(cachedProfile?.websites || []);
    setPhotoFile(undefined);
    setPhotoPreview(undefined);
  }, [
    cachedProfile?.about,
    cachedProfile?.address,
    cachedProfile?.description,
    cachedProfile?.email,
    cachedProfile?.profile_picture_url,
    cachedProfile?.vertical,
    cachedProfile?.websites,
  ]);

  useEffect(() => {
    const integrationKey = integration
      ? `${integration.organization_id}:${orgAddressId}`
      : undefined;
    if (
      integrationKey &&
      canManage &&
      !extra?.profile_synced_at &&
      autoSyncKey.current !== integrationKey
    ) {
      autoSyncKey.current = integrationKey;
      syncProfile.mutate(orgAddressId, {
        onError: (error) =>
          setNotice({ type: "error", text: errorMessage(error) }),
      });
    }
  }, [
    canManage,
    extra?.profile_synced_at,
    integration,
    orgAddressId,
    syncProfile,
  ]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  useEffect(() => {
    if (!showPreview) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPreview(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showPreview]);

  const displayedPhoto =
    photoPreview || cachedProfile?.profile_picture_url || undefined;
  const phoneNumber = extra?.phone_number || "";
  const profileLink = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/\D/g, "")}`
    : "";
  const isConnected =
    integration?.status === "connected" &&
    !["DISCONNECTED", "BANNED"].includes(
      extra?.phone_number_status?.toUpperCase() || "",
    );
  const categoryLabel =
    categories.find(([value]) => value === vertical)?.[1] || vertical;

  const handleSync = () => {
    setNotice(undefined);
    syncProfile.mutate(orgAddressId, {
      onSuccess: () =>
        setNotice({
          type: "success",
          text: t("Perfil sincronizado correctamente"),
        }),
      onError: (error) =>
        setNotice({ type: "error", text: errorMessage(error) }),
    });
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setNotice({
        type: "error",
        text: t("La foto debe ser un archivo JPEG o PNG"),
      });
      return;
    }
    if (file.size > 1024 * 1024) {
      setNotice({
        type: "error",
        text: t("La foto debe pesar 1 MB o menos"),
      });
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setNotice(undefined);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setNotice(undefined);

    if (!vertical) {
      setNotice({ type: "error", text: t("Seleccioná una categoría") });
      return;
    }
    const nonEmptyWebsites = websites
      .map((site) => site.trim())
      .filter(Boolean);

    updateProfile.mutate(
      {
        organizationAddress: orgAddressId,
        vertical,
        description,
        address,
        about,
        email,
        websites: nonEmptyWebsites,
        file: photoFile,
      },
      {
        onSuccess: () =>
          setNotice({
            type: "success",
            text: t("Perfil actualizado correctamente"),
          }),
        onError: (error) =>
          setNotice({ type: "error", text: errorMessage(error) }),
      },
    );
  };

  if (isLoading || !integration) {
    return (
      <>
        <SectionHeader title="Perfil comercial" />
        <SectionBody>
          <div className="flex grow items-center justify-center">
            <Spinner size={32} />
          </div>
        </SectionBody>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Perfil comercial" />
      <SectionBody className="pb-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {t("Límite de mensajes")}:{" "}
                {formatMessagingLimit(extra?.messaging_limit_tier)}
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {t("Calidad")}: {extra?.quality_rating || "—"}
              </div>
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-[#25D366]" : "bg-destructive"
                  }`}
                />
                {extra?.phone_number_status || integration.status}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-4 w-4" />
                {t("Vista previa")}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-default disabled:opacity-50"
                onClick={handleSync}
                disabled={!canManage || syncProfile.isPending}
                title={
                  !canManage
                    ? t("Requiere permisos de administrador")
                    : undefined
                }
              >
                {syncProfile.isPending ? (
                  <Spinner size={16} />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t("Sincronizar perfil")}
              </button>
            </div>
          </div>

          {!isConnected && (
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <div className="font-semibold">
                  {t("WhatsApp desconectado")}
                </div>
                <div className="text-muted-foreground">
                  {t(
                    "No se pueden sincronizar ni actualizar los datos hasta volver a conectar la cuenta.",
                  )}
                </div>
              </div>
            </div>
          )}

          {!extra?.profile_synced_at && !syncProfile.isPending && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {canManage
                ? t("El perfil todavía no fue sincronizado con Meta.")
                : t(
                    "El perfil todavía no fue sincronizado. Un administrador debe sincronizarlo.",
                  )}
            </div>
          )}

          {notice && (
            <div
              className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
                notice.type === "success"
                  ? "border-[#25D366]/30 bg-[#25D366]/10"
                  : "border-destructive/30 bg-destructive/10"
              }`}
            >
              {notice.type === "success" ? (
                <Check className="h-4 w-4 text-[#25D366]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              {notice.text}
            </div>
          )}

          <div className="w-full">
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-2xl border border-border bg-card p-5 pl-5"
            >
              <section>
                <div className="text-base font-semibold">
                  {t("Foto del perfil")}
                </div>
                <p className="mt-1">
                  {t(
                    "Usá una imagen cuadrada JPEG o PNG de hasta 1 MB. El tamaño recomendado es 640 × 640.",
                  )}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  {displayedPhoto ? (
                    <img
                      src={displayedPhoto}
                      alt={t("Foto del perfil")}
                      className="h-20 w-20 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <ImagePlus className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      disabled={!canManage}
                      onChange={(event) => handlePhoto(event.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                      disabled={!canManage}
                      onClick={() => fileInput.current?.click()}
                    >
                      {t("Elegir foto")}
                    </button>
                  </div>
                </div>
              </section>

              <label>
                <div className="label">{t("Nombre verificado")}</div>
                <input
                  className="text"
                  value={extra?.verified_name || ""}
                  readOnly
                />
              </label>

              <label>
                <div className="label">{t("Número de teléfono")}</div>
                <input
                  className="text"
                  value={formatPhoneNumber(phoneNumber)}
                  readOnly
                />
              </label>

              <section>
                <div className="text-base font-semibold">
                  {t("Enlace del perfil comercial")}
                </div>
                <p className="mt-1">
                  {t(
                    "Compartí este enlace para que tus clientes inicien una conversación.",
                  )}
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
                  <a
                    href={profileLink || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-primary"
                  >
                    {profileLink || "—"}
                  </a>
                  <button
                    type="button"
                    className="rounded-full p-2 hover:bg-muted"
                    disabled={!profileLink}
                    title={t("Copiar enlace")}
                    onClick={() => navigator.clipboard.writeText(profileLink)}
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <label>
                <div className="label">{t("Categoría")}</div>
                <select
                  value={vertical}
                  disabled={!canManage}
                  onChange={(event) => setVertical(event.target.value)}
                >
                  <option value="">{t("Seleccioná una categoría")}</option>
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div className="label">{t("Descripción")}</div>
                <textarea
                  className="text min-h-20 disabled:text-muted-foreground"
                  maxLength={256}
                  disabled={!canManage}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {description.length}/256
                </div>
              </label>

              <label>
                <div className="label">{t("Dirección")}</div>
                <textarea
                  className="text min-h-20 disabled:text-muted-foreground"
                  maxLength={256}
                  disabled={!canManage}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {address.length}/256
                </div>
              </label>

              <label>
                <div className="label">{t("Acerca de")}</div>
                <textarea
                  className="text min-h-16 disabled:text-muted-foreground"
                  maxLength={139}
                  disabled={!canManage}
                  value={about}
                  onChange={(event) => setAbout(event.target.value)}
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {about.length}/139
                </div>
              </label>

              <label>
                <div className="label">{t("Correo electrónico")}</div>
                <input
                  type="email"
                  className="text"
                  maxLength={128}
                  disabled={!canManage}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">
                      {t("Sitios web")}
                    </div>
                    <p>{t("Podés agregar hasta dos sitios web.")}</p>
                  </div>
                  {websites.length < 2 && canManage && (
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setWebsites([...websites, ""])}
                    >
                      <Plus className="h-4 w-4" />
                      {t("Agregar")}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {websites.map((website, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="url"
                        className="text"
                        disabled={!canManage}
                        placeholder="https://example.com"
                        value={website}
                        onChange={(event) =>
                          setWebsites(
                            websites.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item,
                            ),
                          )
                        }
                      />
                      {canManage && (
                        <button
                          type="button"
                          className="rounded-full p-2 text-destructive hover:bg-destructive/10"
                          title={t("Eliminar")}
                          onClick={() =>
                            setWebsites(
                              websites.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <Button
                type="submit"
                className="primary ml-auto min-w-44 px-4"
                loading={updateProfile.isPending}
                disabled={!canManage || !isConnected}
                disabledReason={
                  !canManage
                    ? t("Requiere permisos de administrador")
                    : t("La cuenta de WhatsApp está desconectada")
                }
              >
                {t("Guardar cambios")}
              </Button>
            </form>
          </div>
        </div>
      </SectionBody>

      {showPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("Vista previa")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowPreview(false);
          }}
        >
          <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="font-semibold">{t("Vista previa")}</div>
              <button
                type="button"
                className="rounded-full p-2 hover:bg-muted"
                title={t("Cerrar")}
                aria-label={t("Cerrar")}
                onClick={() => setShowPreview(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <WhatsAppBusinessProfilePreview
                pictureUrl={displayedPhoto}
                verifiedName={extra?.verified_name}
                phoneNumber={phoneNumber}
                vertical={categoryLabel}
                description={description}
                address={address}
                about={about}
                email={email}
                websites={websites.filter(Boolean)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
