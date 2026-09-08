export type WhatsAppHealthStatus =
  | "healthy"
  | "warning"
  | "disconnected"
  | "unknown";

export type WhatsAppHealthAction =
  | "test_connection"
  | "refresh_account"
  | "sync_templates";

export function isWhatsAppHealthCheckStale(
  connectionStatus: string,
  lastAttemptedAt: string | null,
  now = Date.now(),
) {
  if (connectionStatus !== "connected") return false;
  if (!lastAttemptedAt) return true;
  return now - new Date(lastAttemptedAt).getTime() > 5 * 60 * 1000;
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  const workerCount = Math.min(
    items.length,
    Math.max(1, Math.floor(concurrency)),
  );

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex++];
        await worker(item);
      }
    }),
  );
}
