export type ContactLookupScope = { organizationId: string; userId: string };

export const CONTACT_LOOKUP_BATCH_SIZE = 50;
const BATCH_WINDOW_MS = 20;
const REQUEST_TIMEOUT_MS = 15_000;

type Lookup<T> = {
  scope: ContactLookupScope;
  address: string;
  active: boolean;
  finish: (value: T | null) => void;
  fail: (error: unknown) => void;
  abortIfUnused?: () => void;
};

/** Coalesce independent query observers without widening their authorized scope. */
export function createContactLookupBatcher<T>(
  read: (
    scope: ContactLookupScope,
    addresses: string[],
    signal: AbortSignal,
  ) => Promise<ReadonlyMap<string, T>>,
) {
  let queued: Lookup<T>[] = [];
  let scheduled = false;
  let running = false;

  async function drain() {
    scheduled = false;
    running = true;
    try {
      while (queued.length > 0) {
        const first = queued.find((entry) => entry.active);
        if (!first) {
          queued = [];
          break;
        }
        const scope = first.scope;
        const batch: Lookup<T>[] = [];
        queued = queued.filter((entry) => {
          if (!entry.active) return false;
          if (
            batch.length >= CONTACT_LOOKUP_BATCH_SIZE ||
            entry.scope.organizationId !== scope.organizationId ||
            entry.scope.userId !== scope.userId
          ) {
            return true;
          }
          batch.push(entry);
          return false;
        });

        const controller = new AbortController();
        const abortIfUnused = () => {
          if (!batch.some((entry) => entry.active)) controller.abort();
        };
        for (const entry of batch) entry.abortIfUnused = abortIfUnused;
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );
        try {
          const addresses = [...new Set(batch.map((entry) => entry.address))];
          const rows = await read(scope, addresses, controller.signal);
          controller.signal.throwIfAborted();
          for (const entry of batch)
            entry.finish(rows.get(entry.address) ?? null);
        } catch (error) {
          for (const entry of batch) entry.fail(error);
        } finally {
          clearTimeout(timeout);
        }
      }
    } finally {
      running = false;
    }
  }

  return (scope: ContactLookupScope, address: string, signal: AbortSignal) =>
    new Promise<T | null>((resolve, reject) => {
      signal.throwIfAborted();
      const settle = () => {
        if (!entry.active) return false;
        entry.active = false;
        signal.removeEventListener("abort", abort);
        return true;
      };
      const abort = () => {
        entry.fail(signal.reason);
        entry.abortIfUnused?.();
      };
      const entry: Lookup<T> = {
        scope,
        address,
        active: true,
        finish: (value) => {
          if (settle()) resolve(value);
        },
        fail: (error) => {
          if (settle())
            reject(
              error instanceof Error
                ? error
                : new Error("Contact lookup failed", { cause: error }),
            );
        },
      };
      signal.addEventListener("abort", abort, { once: true });
      queued.push(entry);
      if (scheduled || running) return;
      scheduled = true;
      setTimeout(() => void drain(), BATCH_WINDOW_MS);
    });
}
