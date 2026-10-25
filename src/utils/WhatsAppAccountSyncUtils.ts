export type WhatsAppAccountSyncStatus = {
  revision: string;
  ack_revision: string;
  status: "pending" | "syncing" | "synchronized" | "failed";
  last_error: string | null;
  synced_at: string | null;
};

export function parseWhatsAppAccountSync(
  value: unknown,
): WhatsAppAccountSyncStatus | null {
  if (value === null) return null;
  if (!value || typeof value !== "object")
    throw new Error("Invalid synchronization response");
  const row = value as Record<string, unknown>;
  if (
    typeof row.revision !== "string" ||
    !/^\d+$/.test(row.revision) ||
    typeof row.ack_revision !== "string" ||
    !/^\d+$/.test(row.ack_revision) ||
    !["pending", "syncing", "synchronized", "failed"].includes(
      String(row.status),
    )
  ) {
    throw new Error("Invalid synchronization response");
  }
  return {
    revision: row.revision,
    ack_revision: row.ack_revision,
    status: row.status as WhatsAppAccountSyncStatus["status"],
    last_error: typeof row.last_error === "string" ? row.last_error : null,
    synced_at: typeof row.synced_at === "string" ? row.synced_at : null,
  };
}

export function accountSyncConfirmed(value: WhatsAppAccountSyncStatus) {
  return (
    value.status === "synchronized" && value.revision === value.ack_revision
  );
}
