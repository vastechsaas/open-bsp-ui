import type { MessageRow } from "@/supabase/client";

export const CUSTOMER_DETAILS_LIMITS = {
  email: 254,
  company: 200,
  jobTitle: 120,
  city: 120,
  country: 120,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCustomerEmail(value: string | null | undefined) {
  const email = value?.trim() ?? "";
  return (
    !email ||
    (email.length <= CUSTOMER_DETAILS_LIMITS.email && EMAIL_PATTERN.test(email))
  );
}

export function normalizeCustomerDetail(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

export function getLatestCustomerInteraction(
  messages: Iterable<MessageRow> | null | undefined,
) {
  if (!messages) return null;

  let latest: string | null = null;
  for (const message of messages) {
    if (message.direction !== "incoming" && message.direction !== "outgoing") {
      continue;
    }

    if (!latest || +new Date(message.timestamp) > +new Date(latest)) {
      latest = message.timestamp;
    }
  }

  return latest;
}
