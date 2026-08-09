import { message as toast } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import localizedFormat from "dayjs/plugin/localizedFormat";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import Avatar from "./Avatar";
import Button from "./Button";
import FieldError from "./FieldError";
import Spinner from "./Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CustomerDetailsUpdate,
  useContactByAddress,
  useLastCustomerInteraction,
  useUpdateCustomerDetails,
} from "@/queries/useContacts";
import { useContactAddress } from "@/queries/useContactsAddresses";
import useBoundStore from "@/stores/useBoundStore";
import type { InstagramContactAddressExtra } from "@/supabase/client";
import {
  CUSTOMER_DETAILS_LIMITS,
  getLatestCustomerInteraction,
  isValidCustomerEmail,
} from "@/utils/CustomerDetailsUtils";
import { formatPhoneNumber, nameInitials } from "@/utils/FormatUtils";

dayjs.extend(localizedFormat);

function ReadOnlyDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-[14px] text-foreground">{value}</div>
      </div>
    </div>
  );
}

function TextField({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: ReactNode;
  error?: Parameters<typeof FieldError>[0]["error"];
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      {children}
      <FieldError error={error} />
    </label>
  );
}

export default function CustomerDetailsPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const activeConvId = useBoundStore((state) => state.ui.activeConvId);
  const conversation = useBoundStore((state) =>
    state.chat.conversations.get(state.ui.activeConvId || ""),
  );
  const messages = useBoundStore((state) =>
    state.chat.messages.get(state.ui.activeConvId || ""),
  );
  const { data: contact, isLoading } = useContactByAddress(
    conversation?.contact_address,
  );
  const { data: contactAddress } = useContactAddress(
    conversation?.contact_address,
  );
  const updateDetails = useUpdateCustomerDetails();
  const { data: persistedLatestInteraction } = useLastCustomerInteraction(
    conversation?.id,
  );
  const { translate: t, currentLanguage } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<CustomerDetailsUpdate>({
    mode: "onTouched",
    values: {
      id: contact?.id ?? "",
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      company: contact?.company ?? "",
      job_title: contact?.job_title ?? "",
      city: contact?.city ?? "",
      country: contact?.country ?? "",
    },
  });

  const liveLatestInteraction = getLatestCustomerInteraction(
    messages?.values(),
  );
  const latestInteraction = [persistedLatestInteraction, liveLatestInteraction]
    .filter((value): value is string => !!value)
    .sort((a, b) => +new Date(b) - +new Date(a))[0];
  const formatDateTime = (value: string) =>
    dayjs(value).locale(currentLanguage).format("lll");

  const service = conversation?.service;
  const address = conversation?.contact_address;
  const igExtra =
    service === "instagram"
      ? (contactAddress?.extra as InstagramContactAddressExtra | null)
      : null;
  const displayAddress =
    service === "whatsapp" && address
      ? formatPhoneNumber(address)
      : igExtra?.username
        ? `@${igExtra.username}`
        : address || t("No disponible");
  const displayName =
    contact?.name || contactAddress?.extra?.name || displayAddress;

  const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <aside
      className="z-40 flex h-full w-full shrink-0 flex-col border-l border-border bg-background text-foreground shadow-xl md:w-[360px] xl:w-[400px]"
      aria-label={t("Detalles del cliente")}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-[16px] font-semibold">
            {t("Detalles del cliente")}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            {t("Los cambios se guardan en Contactos")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={t("Cerrar detalles del cliente")}
          aria-label={t("Cerrar detalles del cliente")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : !contact || !activeConvId ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] text-muted-foreground">
          {t("No hay un contacto vinculado a esta conversación")}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-5 flex items-center gap-3">
              <Avatar
                src={igExtra?.profile_picture_url}
                fallback={nameInitials(displayName)}
                size={48}
                className="border border-border bg-accent text-accent-foreground text-[16px]"
              />
              <div className="min-w-0">
                <div className="truncate text-[16px] font-semibold">
                  {displayName}
                </div>
                <div className="truncate text-[13px] text-muted-foreground">
                  {displayAddress}
                </div>
              </div>
            </div>

            <div className="mb-5 grid gap-2">
              <ReadOnlyDetail
                icon={<Phone className="h-4 w-4" />}
                label={service === "instagram" ? "Instagram" : "WhatsApp"}
                value={displayAddress}
              />
              <ReadOnlyDetail
                icon={<CalendarDays className="h-4 w-4" />}
                label={t("Contacto creado")}
                value={formatDateTime(contact.created_at)}
              />
              <ReadOnlyDetail
                icon={<Clock3 className="h-4 w-4" />}
                label={t("Última interacción")}
                value={
                  latestInteraction
                    ? formatDateTime(latestInteraction)
                    : t("Sin actividad")
                }
              />
            </div>

            <form
              id="customer-details-form"
              className="grid gap-4"
              onSubmit={handleSubmit(async (details) => {
                try {
                  const saved = await updateDetails.mutateAsync(details);
                  reset({ ...details, ...saved, id: saved.id });
                  void toast.success(t("Detalles del cliente actualizados"));
                } catch {
                  void toast.error(
                    t("No se pudieron guardar los detalles del cliente"),
                  );
                }
              })}
            >
              <TextField
                label={t("Nombre")}
                icon={<UserRound className="h-4 w-4" />}
              >
                <input
                  className={inputClass}
                  type="text"
                  placeholder={t("Nombre del contacto")}
                  {...register("name")}
                />
              </TextField>

              <TextField
                label={t("Correo electrónico")}
                icon={<Mail className="h-4 w-4" />}
                error={errors.email}
              >
                <input
                  className={inputClass}
                  type="email"
                  maxLength={CUSTOMER_DETAILS_LIMITS.email}
                  placeholder="customer@example.com"
                  {...register("email", {
                    validate: (value) =>
                      isValidCustomerEmail(value) ||
                      t("Correo electrónico inválido"),
                  })}
                />
              </TextField>

              <TextField
                label={t("Empresa")}
                icon={<Building2 className="h-4 w-4" />}
              >
                <input
                  className={inputClass}
                  type="text"
                  maxLength={CUSTOMER_DETAILS_LIMITS.company}
                  {...register("company")}
                />
              </TextField>

              <TextField
                label={t("Cargo")}
                icon={<BriefcaseBusiness className="h-4 w-4" />}
              >
                <input
                  className={inputClass}
                  type="text"
                  maxLength={CUSTOMER_DETAILS_LIMITS.jobTitle}
                  {...register("job_title")}
                />
              </TextField>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label={t("Ciudad")}
                  icon={<MapPin className="h-4 w-4" />}
                >
                  <input
                    className={inputClass}
                    type="text"
                    maxLength={CUSTOMER_DETAILS_LIMITS.city}
                    {...register("city")}
                  />
                </TextField>
                <TextField
                  label={t("País")}
                  icon={<MapPin className="h-4 w-4" />}
                >
                  <input
                    className={inputClass}
                    type="text"
                    maxLength={CUSTOMER_DETAILS_LIMITS.country}
                    {...register("country")}
                  />
                </TextField>
              </div>
            </form>

            <button
              type="button"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() =>
                navigate({
                  to: `/contacts/${contact.id}`,
                  hash: undefined,
                })
              }
            >
              <ExternalLink className="h-4 w-4" />
              {t("Abrir contacto completo")}
            </button>
          </div>

          <div className="border-t border-border p-4">
            <Button
              form="customer-details-form"
              type="submit"
              invalid={!isDirty || !isValid}
              loading={updateDetails.isPending}
              className="primary w-full"
            >
              {t("Guardar cambios")}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
