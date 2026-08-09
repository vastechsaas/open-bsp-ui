import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import localizedFormat from "dayjs/plugin/localizedFormat";
import {
  Building2,
  ContactRound,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { InstagramOutlined, WhatsAppOutlined } from "@ant-design/icons";
import Avatar from "@/components/Avatar";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type ContactListAddress,
  type ContactListRow,
  getContactListAddresses,
  useContactsPage,
} from "@/queries/useContacts";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import { formatPhoneNumber, nameInitials } from "@/utils/FormatUtils";

dayjs.extend(localizedFormat);

export const Route = createFileRoute("/_auth/contacts/")({
  component: ContactManager,
});

function displayAddress(address: ContactListAddress) {
  if (address.service === "whatsapp") {
    return formatPhoneNumber(address.address);
  }
  if (address.service === "instagram" && address.username) {
    return `@${address.username}`;
  }
  return address.address;
}

function ChannelIcon({ service }: { service: ContactListAddress["service"] }) {
  if (service === "whatsapp") {
    return <WhatsAppOutlined className="text-green-500" />;
  }
  if (service === "instagram") {
    return <InstagramOutlined className="text-pink-500" />;
  }
  return <ContactRound className="h-3.5 w-3.5 text-muted-foreground" />;
}

function ContactChannels({ contact }: { contact: ContactListRow }) {
  const addresses = getContactListAddresses(contact);
  if (!addresses.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[260px] flex-col gap-1.5">
      {addresses.slice(0, 2).map((address) => (
        <div
          key={`${address.service}:${address.raw_address}`}
          className="flex min-w-0 items-center gap-1.5 text-[13px]"
        >
          <ChannelIcon service={address.service} />
          <span className="truncate">{displayAddress(address)}</span>
        </div>
      ))}
      {addresses.length > 2 && (
        <span className="text-[11px] text-muted-foreground">
          +{addresses.length - 2}
        </span>
      )}
    </div>
  );
}

function ContactManager() {
  const { translate: t, currentLanguage } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data, isLoading, isError } = useContactsPage({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  useEffect(() => setPage(1), [search]);

  const contacts = data?.rows || [];
  const total = data?.total || 0;
  const hasSearch = !!search.trim();
  const editContact = (id: string) =>
    void navigate({ to: `/contacts/${id}`, hash: undefined });

  return (
    <div className="h-full min-w-0 overflow-y-auto bg-background p-[16px] text-foreground md:p-[28px]">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-[22px] flex flex-col gap-[16px] sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[24px] font-semibold">
              {t("Gestor de contactos")}
            </h1>
            <p className="mt-[4px] text-[13px] text-muted-foreground">
              {t("Administrá los datos de los clientes de tu organización.")}
            </p>
          </div>
          <button
            type="button"
            className="primary flex items-center justify-center gap-[8px] px-[18px] py-[10px] sm:ml-auto"
            onClick={() => void navigate({ to: "/contacts/new" })}
          >
            <Plus className="h-[17px] w-[17px]" />
            {t("Agregar contacto")}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border p-[14px]">
            <label className="flex h-[40px] items-center gap-[9px] rounded-lg border border-input px-[12px] lg:max-w-[460px]">
              <Search className="h-[16px] w-[16px] text-muted-foreground" />
              <input
                className="w-full border-none bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar por nombre, canal o datos del cliente")}
              />
            </label>
          </div>

          {isLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <ContactEmptyState
              icon={<ContactRound className="h-6 w-6" />}
              title={t("No se pudieron cargar los contactos")}
              description={t("Intentá nuevamente en unos minutos.")}
            />
          ) : contacts.length === 0 ? (
            <ContactEmptyState
              icon={<ContactRound className="h-6 w-6" />}
              title={
                hasSearch
                  ? t("No hay contactos que coincidan con la búsqueda")
                  : t("Todavía no hay contactos")
              }
              description={
                hasSearch
                  ? t("Probá con otro nombre, canal o dato del cliente.")
                  : t("Agregá tu primer contacto para comenzar.")
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1180px] text-left">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">{t("Cliente")}</th>
                      <th className="px-4 py-3">{t("Canales")}</th>
                      <th className="px-4 py-3">{t("Correo electrónico")}</th>
                      <th className="px-4 py-3">{t("Empresa y cargo")}</th>
                      <th className="px-4 py-3">{t("Ubicación")}</th>
                      <th className="px-4 py-3">{t("Actualizado")}</th>
                      <th className="px-4 py-3 text-right">{t("Acciones")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <ContactTableRow
                        key={contact.id}
                        contact={contact}
                        updatedAt={dayjs(contact.updated_at)
                          .locale(currentLanguage)
                          .format("ll")}
                        onEdit={() => editContact(contact.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border lg:hidden">
                {contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    updatedAt={dayjs(contact.updated_at)
                      .locale(currentLanguage)
                      .format("ll")}
                    onEdit={() => editContact(contact.id)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col justify-between gap-[10px] border-t border-border px-[14px] py-[12px] text-[12px] text-muted-foreground sm:flex-row sm:items-center">
            <span>
              {total} {t("contactos")}
            </span>
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              disabled={isLoading}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactTableRow({
  contact,
  updatedAt,
  onEdit,
}: {
  contact: ContactListRow;
  updatedAt: string;
  onEdit: () => void;
}) {
  const { translate: t } = useTranslation();
  const location = [contact.city, contact.country].filter(Boolean).join(", ");

  return (
    <tr className="border-t border-border transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            fallback={nameInitials(contact.name || "?")}
            size={36}
            className="border border-border bg-accent text-accent-foreground text-[12px]"
          />
          <span className="max-w-[220px] truncate font-medium">
            {contact.name || t("Sin nombre")}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <ContactChannels contact={contact} />
      </td>
      <td className="max-w-[230px] truncate px-4 py-3 text-[13px]">
        {contact.email || <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 text-[13px]">
        <div className="max-w-[220px] truncate">{contact.company || "—"}</div>
        {contact.job_title && (
          <div className="max-w-[220px] truncate text-[12px] text-muted-foreground">
            {contact.job_title}
          </div>
        )}
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-[13px]">
        {location || <span className="text-muted-foreground">—</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-muted-foreground">
        {updatedAt}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onEdit}
          title={t("Editar contacto")}
          aria-label={t("Editar contacto")}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function ContactCard({
  contact,
  updatedAt,
  onEdit,
}: {
  contact: ContactListRow;
  updatedAt: string;
  onEdit: () => void;
}) {
  const { translate: t } = useTranslation();
  const location = [contact.city, contact.country].filter(Boolean).join(", ");

  return (
    <article className="p-4">
      <div className="flex items-start gap-3">
        <Avatar
          fallback={nameInitials(contact.name || "?")}
          size={40}
          className="border border-border bg-accent text-accent-foreground text-[13px]"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {contact.name || t("Sin nombre")}
          </div>
          <div className="mt-1">
            <ContactChannels contact={contact} />
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border p-2 text-muted-foreground"
          onClick={onEdit}
          title={t("Editar contacto")}
          aria-label={t("Editar contacto")}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-[13px]">
        {contact.email && (
          <ContactCardDetail
            icon={<Mail className="h-3.5 w-3.5" />}
            value={contact.email}
          />
        )}
        {(contact.company || contact.job_title) && (
          <ContactCardDetail
            icon={<Building2 className="h-3.5 w-3.5" />}
            value={[contact.company, contact.job_title]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        {location && (
          <ContactCardDetail
            icon={<MapPin className="h-3.5 w-3.5" />}
            value={location}
          />
        )}
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">
        {t("Actualizado")}: {updatedAt}
      </div>
    </article>
  );
}

function ContactCardDetail({
  icon,
  value,
}: {
  icon: ReactNode;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
      {icon}
      <span className="truncate text-foreground">{value}</span>
    </div>
  );
}

function ContactEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        {icon}
      </div>
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <p className="mt-1 max-w-[420px] text-[13px] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
