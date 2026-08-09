import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ContactAddressInsert,
  type ContactUpdate,
  type ContactWithAddressesInsert,
  type ContactWithAddressesRow,
  type ContactWithAddressesUpdate,
  supabase,
  type WhatsAppContactAddressExtra,
  type Database,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { normalizePhoneNumber } from "@/utils/FormatUtils";
import { queryKeys } from "./queryKeys";
import { normalizeCustomerDetail } from "@/utils/CustomerDetailsUtils";
import type { DataTablePageParams } from "@/utils/DataTableUtils";

export type ContactListRow =
  Database["public"]["Functions"]["list_contacts_page"]["Returns"][number];

export type ContactListAddress = {
  service: "whatsapp" | "instagram" | "local";
  address: string;
  raw_address: string;
  name?: string | null;
  username?: string | null;
};

export function getContactListAddresses(contact: ContactListRow) {
  return Array.isArray(contact.addresses)
    ? (contact.addresses as ContactListAddress[])
    : [];
}

export function useContactsPage(params: DataTablePageParams) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.contacts.page(orgId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_contacts_page", {
          p_organization_id: orgId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
        })
        .throwOnError();

      return {
        rows: result.data as ContactListRow[],
        total: result.data[0]?.total_count || 0,
      };
    },
    enabled: !!orgId,
  });
}

export type CustomerDetailsUpdate = Pick<
  ContactUpdate,
  "id" | "name" | "email" | "company" | "job_title" | "city" | "country"
> & { id: string };

function invalidateContactQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | null,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.contacts.all(orgId),
  });
  void queryClient.invalidateQueries({
    queryKey: [orgId, "contacts_addresses"],
  });
}

function normalizeStructuredContactDetails<T extends ContactUpdate>(data: T) {
  return {
    ...data,
    ...(data.name !== undefined
      ? { name: normalizeCustomerDetail(data.name) }
      : {}),
    ...(data.email !== undefined
      ? {
          email: normalizeCustomerDetail(data.email)?.toLowerCase() ?? null,
        }
      : {}),
    ...(data.company !== undefined
      ? { company: normalizeCustomerDetail(data.company) }
      : {}),
    ...(data.job_title !== undefined
      ? { job_title: normalizeCustomerDetail(data.job_title) }
      : {}),
    ...(data.city !== undefined
      ? { city: normalizeCustomerDetail(data.city) }
      : {}),
    ...(data.country !== undefined
      ? { country: normalizeCustomerDetail(data.country) }
      : {}),
  };
}

export function useContactByAddress(address: string | null | undefined) {
  const userId = useBoundStore((state) => state.ui.user?.id);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.contacts.byAddress(orgId, address),
    queryFn: async () =>
      await supabase
        .from("contacts_addresses")
        .select("*, contact:contacts(*)")
        .eq("organization_id", orgId!)
        .eq("address", address!)
        .single()
        .throwOnError(),
    enabled: !!userId && !!orgId && !!address,
    select: (data) => data.data.contact,
    experimental_prefetchInRender: true,
  });
}

export function useContacts() {
  const userId = useBoundStore((state) => state.ui.user?.id);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.contacts.all(orgId),
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: ContactWithAddressesRow[] = [];
      let offset = 0;

      while (true) {
        const { data: page } = await supabase
          .from("contacts")
          .select("*, addresses:contacts_addresses(*)")
          .eq("organization_id", orgId!)
          .order("name", { ascending: true })
          .order("created_at", {
            referencedTable: "addresses",
            ascending: true,
          })
          .range(offset, offset + PAGE_SIZE - 1)
          .throwOnError();

        allData = [...allData, ...(page as ContactWithAddressesRow[])];
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      // Seed individual contact cache entries
      for (const contact of allData) {
        queryClient.setQueryData(queryKeys.contacts.detail(orgId, contact.id), {
          data: contact,
        });
      }

      return { data: allData };
    },
    enabled: !!userId && !!orgId,
    select: (data) => data.data,
  });
}

export function useContact(id: string) {
  const userId = useBoundStore((state) => state.ui.user?.id);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.contacts.detail(orgId, id),
    queryFn: async () =>
      await supabase
        .from("contacts")
        .select("*, addresses:contacts_addresses(*)")
        .eq("id", id)
        .order("created_at", { referencedTable: "addresses", ascending: true })
        .single()
        .throwOnError(),
    enabled: !!userId && !!orgId && !!id,
    select: (data) => data.data as ContactWithAddressesRow,
    experimental_prefetchInRender: true,
  });
}

export function useLastCustomerInteraction(
  conversationId: string | null | undefined,
) {
  const userId = useBoundStore((state) => state.ui.user?.id);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: [
      orgId,
      "conversations",
      conversationId,
      "last_customer_interaction",
    ],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("timestamp")
        .eq("organization_id", orgId!)
        .eq("conversation_id", conversationId!)
        .in("direction", ["incoming", "outgoing"])
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle()
        .throwOnError();

      return data?.timestamp ?? null;
    },
    enabled: !!userId && !!orgId && !!conversationId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (data: ContactWithAddressesInsert) => {
      if (!orgId) throw new Error("No active organization");

      const { addresses, ...contactData } = data;
      const normalizedContactData =
        normalizeStructuredContactDetails(contactData);

      // Create contact
      const { data: contact } = await supabase
        .from("contacts")
        .insert({ ...normalizedContactData, organization_id: orgId })
        .select()
        .single()
        .throwOnError();

      // Link addresses to contact (deduplicate by normalized address)
      const toLink = addresses
        .filter((a) => Boolean(a.address))
        .map((a) => ({ ...a, address: normalizePhoneNumber(a.address!) }))
        .filter(
          (a, i, arr) => arr.findIndex((x) => x.address === a.address) === i,
        );

      toLink.length &&
        (await supabase
          .from("contacts_addresses")
          .upsert(
            toLink.map(
              (a) =>
                ({
                  ...a,
                  organization_id: orgId,
                  service: "whatsapp" as const,
                  contact_id: contact.id,
                }) as ContactAddressInsert,
            ),
            { onConflict: "organization_id, address", defaultToNull: false },
          )
          .throwOnError());

      return contact;
    },
    onSuccess: () => {
      invalidateContactQueries(queryClient, orgId);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (data: ContactWithAddressesUpdate) => {
      if (!orgId) throw new Error("No active organization");
      if (!data.id) throw new Error("No contact id");

      const { addresses: rawNewAddresses, ...newContact } = data;
      const normalizedContact = normalizeStructuredContactDetails(newContact);

      const { data: contact } = await supabase
        .from("contacts")
        .update(normalizedContact)
        .eq("id", data.id)
        .select()
        .single()
        .throwOnError();

      const cached = queryClient.getQueryData<{
        data: ContactWithAddressesRow;
      }>(queryKeys.contacts.detail(orgId, data.id));
      const oldAddresses = cached?.data?.addresses ?? [];

      const oldAddressesString = oldAddresses.map((a) => a.address) ?? [];

      const newAddresses = rawNewAddresses.map((a) => ({
        ...a,
        address: normalizePhoneNumber(a.address!),
      }));

      const newAddressesString = [
        ...new Set(
          newAddresses.map((a) => a.address).filter(Boolean) as string[],
        ),
      ];

      // Upsert addresses to link (set contact_id)
      // Note: If address exists in another contact, it will be reassigned (TODO: show warning)
      const toLink = newAddressesString
        .filter((a) => !oldAddressesString.includes(a))
        .map((address) => {
          const addressObject = newAddresses.find((a) => a.address === address);

          return {
            ...addressObject,
            organization_id: orgId,
            service: "whatsapp" as const,
            contact_id: data.id,
          } as ContactAddressInsert;
        });

      // Unlink removed addresses (set contact_id to null)
      // DB trigger will delete if no conversations reference them
      const toUnlink = oldAddressesString
        .filter((a) => !newAddressesString.includes(a))
        .map((address) => {
          const addressObject = oldAddresses.find((a) => a.address === address);

          return {
            ...addressObject,
            contact_id: null,
          } as ContactAddressInsert;
        });

      // The insert policy prevents the creation of synced address by the users.
      // The update policy allows synced address to be updated.
      // Upsert with extra.synced.action='add' in payload fails even if the row exists,
      // because PostgreSQL checks INSERT policy BEFORE conflict detection.
      const toUpsert = [...toLink, ...toUnlink].filter(
        (a) =>
          !(
            (a.extra as WhatsAppContactAddressExtra | undefined)?.synced
              ?.action === "add"
          ),
      );
      const toUpdate = [...toLink, ...toUnlink].filter(
        (a) =>
          (a.extra as WhatsAppContactAddressExtra | undefined)?.synced
            ?.action === "add",
      );

      await Promise.all([
        // Upsert non-synced addresses
        toUpsert.length > 0 &&
          supabase
            .from("contacts_addresses")
            .upsert(toUpsert, {
              onConflict: "organization_id, address",
              defaultToNull: false,
            })
            .throwOnError(),
        // Update synced addresses individually (no mass update in Supabase)
        ...toUpdate.map((a) =>
          supabase
            .from("contacts_addresses")
            .update(a)
            .eq("organization_id", a.organization_id)
            .eq("address", a.address)
            .throwOnError(),
        ),
      ]);

      return contact;
    },
    onSuccess: () => {
      invalidateContactQueries(queryClient, orgId);
    },
  });
}

export function useUpdateCustomerDetails() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ id, ...details }: CustomerDetailsUpdate) => {
      if (!orgId) throw new Error("No active organization");

      const normalized = {
        name: normalizeCustomerDetail(details.name),
        email: normalizeCustomerDetail(details.email)?.toLowerCase() ?? null,
        company: normalizeCustomerDetail(details.company),
        job_title: normalizeCustomerDetail(details.job_title),
        city: normalizeCustomerDetail(details.city),
        country: normalizeCustomerDetail(details.country),
      } satisfies ContactUpdate;

      const { data } = await supabase
        .from("contacts")
        .update(normalized)
        .eq("organization_id", orgId)
        .eq("id", id)
        .select()
        .single()
        .throwOnError();

      return data;
    },
    onSuccess: () => invalidateContactQueries(queryClient, orgId),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("No active organization");

      await supabase.from("contacts").delete().eq("id", id).throwOnError();
    },
    onSuccess: () => {
      invalidateContactQueries(queryClient, orgId);
    },
  });
}
