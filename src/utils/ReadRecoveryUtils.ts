// Retry reads only. Never replay a chat action because its follow-up read failed.
export function retryTransientRead(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false;
  const value = error as {
    status?: number;
    code?: string;
    name?: string;
  } | null;
  if (value?.name === "AbortError") return false;
  if (["42501", "PGRST116", "PGRST301"].includes(value?.code ?? ""))
    return false;
  const status = Number(value?.status);
  return !status || status === 408 || status === 429 || status >= 500;
}

export async function recoverRead<T>(
  read: () => PromiseLike<T>,
  signal: AbortSignal,
  wait: (ms: number, signal: AbortSignal) => Promise<void> = waitForReadRetry,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const result = await read();
      signal.throwIfAborted();
      return result;
    } catch (error) {
      signal.throwIfAborted();
      if (!retryTransientRead(attempt, error)) throw error;
      await wait(attempt === 0 ? 500 : 1500, signal);
    }
  }
}

function waitForReadRetry(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      const reason: unknown = signal.reason;
      reject(
        reason instanceof Error
          ? reason
          : new DOMException("Read cancelled", "AbortError"),
      );
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function messageSenderLabel(
  sender: { name?: string | null } | null | undefined,
  fallback: string,
) {
  return sender?.name?.trim() || fallback;
}
