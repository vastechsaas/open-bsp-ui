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

  const candidate = error as { code?: unknown; message?: unknown };
  const code =
    typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLowerCase()
      : "";

  return (
    code === "session_not_found" ||
    message.includes("session from session_id claim in jwt does not exist")
  );
}
