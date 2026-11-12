type RemovableStorage = Pick<Storage, "removeItem">;

export function getSupabaseAuthStorageKeys(supabaseUrl: string): string[] {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  return [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`];
}

export function clearSupabaseAuthStorage(
  storage: RemovableStorage,
  supabaseUrl: string,
): void {
  for (const key of getSupabaseAuthStorageKeys(supabaseUrl)) {
    storage.removeItem(key);
  }
}

export function isMissingServerSession(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };
  const code =
    typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLowerCase()
      : "";

  return (
    candidate.name === "AuthSessionMissingError" ||
    code === "session_not_found" ||
    message.includes("session from session_id claim in jwt does not exist")
  );
}

export function isUnauthorizedResponse(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { status?: unknown }).status === 401
  );
}

// Check the current browser session, not the token from an older request.
// An Auth outage must not turn a read failure into a sign-out.
export function createRejectedSessionCheck({
  currentUser,
  getUser,
  getSession,
  endLocalSession,
}: {
  currentUser: () => object | null;
  getUser: () => Promise<{ error: unknown }>;
  getSession: () => Promise<{ error: unknown; data: { session: unknown } }>;
  endLocalSession: () => Promise<unknown>;
}) {
  let pending: Promise<void> | undefined;
  return (error: unknown): Promise<void> => {
    const browserUser = currentUser();
    if (!isUnauthorizedResponse(error) || !browserUser)
      return Promise.resolve();
    pending ??= Promise.resolve()
      .then(async () => {
        if (currentUser() !== browserUser) return;
        // The SDK normally clears a revoked session and emits SIGNED_OUT.
        const result = await getUser();
        if (
          !isMissingServerSession(result.error) ||
          currentUser() !== browserUser
        )
          return;

        // An already-empty browser session may not emit SIGNED_OUT.
        // Never sign out a replacement session that arrived during the check.
        const current = await getSession();
        if (
          !current.error &&
          !current.data.session &&
          currentUser() === browserUser
        )
          await endLocalSession();
      })
      .catch(() => undefined)
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}
