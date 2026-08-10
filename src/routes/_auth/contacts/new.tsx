import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import { useTranslation } from "@/hooks/useTranslation";
import { useCreateContact } from "@/queries/useContacts";
import type { ContactWithAddressesInsert } from "@/supabase/client";
import {
  CUSTOMER_DETAILS_LIMITS,
  isValidCustomerEmail,
} from "@/utils/CustomerDetailsUtils";
import { isValidPhoneNumber } from "@/utils/FormatUtils";

export const Route = createFileRoute("/_auth/contacts/new")({
  component: ContactNew,
});

const inputClass =
  "h-[42px] w-full rounded-lg border border-input bg-background px-[12px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

function ContactNew() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const createContact = useCreateContact();

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty, errors },
  } = useForm<ContactWithAddressesInsert>({
    mode: "onTouched",
    defaultValues: {
      addresses: [{ address: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const returnToContacts = () => void navigate({ to: "/contacts" });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-background px-[20px] py-[18px] md:px-[32px]">
        <div className="mx-auto flex max-w-[1100px] items-center gap-[12px]">
          <button
            type="button"
            className="ml-[-8px] rounded-full p-[8px] hover:bg-muted"
            title={t("Volver")}
            onClick={returnToContacts}
          >
            <ArrowLeft className="h-[22px] w-[22px]" />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold">{t("Nuevo contacto")}</h1>
            <p className="mt-[2px] text-[12px] text-muted-foreground">
              {t("AdministrÃ¡ los datos de los clientes de tu organizaciÃ³n.")}
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-[16px] md:p-[24px]">
        <form
          id="contact-form"
          className="mx-auto max-w-[1100px] gap-[16px] pl-0"
          onSubmit={handleSubmit((data) =>
            createContact.mutate(data, {
              onSuccess: () => returnToContacts(),
            }),
          )}
        >
          <section className="rounded-xl border border-border bg-background p-[16px] md:p-[20px]">
            <div className="mb-[18px]">
              <h2 className="font-medium">{t("Detalles del contacto")}</h2>
              <p className="mt-[3px] text-[12px] text-muted-foreground">
                {t("InformaciÃ³n principal y ubicaciÃ³n del cliente.")}
              </p>
            </div>

            <div className="grid gap-[16px] md:grid-cols-2">
              <ContactField label={t("Nombre")}>
                <input
                  autoFocus
                  type="text"
                  className={inputClass}
                  placeholder={t("Nombre del contacto")}
                  {...register("name")}
                />
              </ContactField>

              <ContactField label={t("Correo electrÃ³nico")}>
                <input
                  type="email"
                  className={`${inputClass} ${errors.email ? "border-destructive" : ""}`}
                  maxLength={CUSTOMER_DETAILS_LIMITS.email}
                  placeholder="customer@example.com"
                  {...register("email", {
                    validate: (value) =>
                      isValidCustomerEmail(value) ||
                      t("Correo electrÃ³nico invÃ¡lido"),
                  })}
                />
                <FieldError error={errors.email} />
              </ContactField>

              <ContactField label={t("Empresa")}>
                <input
                  type="text"
                  className={inputClass}
                  maxLength={CUSTOMER_DETAILS_LIMITS.company}
                  {...register("company")}
                />
              </ContactField>

              <ContactField label={t("Cargo")}>
                <input
                  type="text"
                  className={inputClass}
                  maxLength={CUSTOMER_DETAILS_LIMITS.jobTitle}
                  {...register("job_title")}
                />
              </ContactField>

              <ContactField label={t("Ciudad")}>
                <input
                  type="text"
                  className={inputClass}
                  maxLength={CUSTOMER_DETAILS_LIMITS.city}
                  {...register("city")}
                />
              </ContactField>

              <ContactField label={t("PaÃ­s")}>
                <input
                  type="text"
                  className={inputClass}
                  maxLength={CUSTOMER_DETAILS_LIMITS.country}
                  {...register("country")}
                />
              </ContactField>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background p-[16px] md:p-[20px]">
            <div className="mb-[18px]">
              <h2 className="font-medium">{t("NÃºmeros de telÃ©fono")}</h2>
              <p className="mt-[3px] text-[12px] text-muted-foreground">
                {t("AgregÃ¡ uno o mÃ¡s nÃºmeros de WhatsApp.")}
              </p>
            </div>

            <div className="grid gap-[14px] md:grid-cols-2">
              {fields.map((field, idx) => (
                <ContactField
                  key={field.id}
                  label={`${t("TelÃ©fono")} ${idx + 1}`}
                >
                  <div className="flex items-center gap-[8px]">
                    <input
                      type="tel"
                      className={`${inputClass} ${errors.addresses?.[idx]?.address ? "border-destructive" : ""}`}
                      placeholder={t("+54 9 11 1234 5678")}
                      {...register(`addresses.${idx}.address`, {
                        validate: (value) =>
                          !value ||
                          isValidPhoneNumber(value) ||
                          t("NÃºmero invÃ¡lido"),
                      })}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-border p-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={fields.length === 1}
                      onClick={() => remove(idx)}
                      title={t("Eliminar")}
                    >
                      <X className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  <FieldError error={errors.addresses?.[idx]?.address} />
                </ContactField>
              ))}
            </div>

            <button
              type="button"
              className="mt-[16px] flex w-fit items-center gap-[7px] rounded-lg border border-border px-[13px] py-[9px] text-[13px] font-medium transition-colors hover:bg-muted"
              onClick={() => append({ address: "" })}
            >
              <Plus className="h-[16px] w-[16px]" />
              {t("Agregar telÃ©fono")}
            </button>
          </section>
        </form>
      </div>

      <footer className="flex shrink-0 justify-end gap-[10px] border-t border-border bg-background px-[20px] py-[14px] md:px-[32px]">
        <button
          type="button"
          className="rounded-lg border border-border px-[20px] py-[10px] text-[13px] hover:bg-muted"
          onClick={returnToContacts}
        >
          {t("Cancelar")}
        </button>
        <Button
          form="contact-form"
          type="submit"
          invalid={!isValid || !isDirty}
          loading={createContact.isPending}
          className="primary min-w-[130px] px-[24px] py-[10px]"
        >
          {t("Crear")}
        </Button>
      </footer>
    </div>
  );
}

function ContactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-[6px] block text-[12px] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
