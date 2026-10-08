import type { MessageInsert, MessageRow } from "@/supabase/client";

/** Persist the send intent, not the optimistic row used to render the bubble. */
export function mediaMessageInsert(
  preview: MessageRow,
  originalInsert?: MessageInsert,
): MessageInsert {
  // Explicit timestamps (including scheduled sends) belong to the original
  // insert. Preview timestamps cannot distinguish scheduling from clock skew.
  if (originalInsert) return { ...originalInsert };

  // Compatibility for uploads created before the original insert was retained.
  // Immediate sends must use Postgres defaults, never the browser's clock.
  const insert: MessageInsert = { ...preview };
  delete insert.timestamp;
  delete insert.created_at;
  delete insert.updated_at;
  delete insert.status;
  return insert;
}
