export const IG_INAPP_REDIRECT_PATH = "/oauth/instagram";
export const IG_OAUTH_CONTEXT_KEY = "instagram-oauth-context";
export const IG_OAUTH_MAX_AGE_MS = 30 * 60 * 1000;

export type InstagramOAuthContext = {
  state: string;
  organizationId: string;
  userId: string;
  createdAt: number;
};

export function consumeInstagramOAuthContext(
  storage: Pick<Storage, "getItem" | "removeItem">,
  state: string | undefined,
  organizationId: string | null,
  userId: string | undefined,
  now = Date.now(),
): InstagramOAuthContext {
  const raw = storage.getItem(IG_OAUTH_CONTEXT_KEY);
  storage.removeItem(IG_OAUTH_CONTEXT_KEY);
  let context: Partial<InstagramOAuthContext> | null = null;
  try {
    context = raw ? (JSON.parse(raw) as Partial<InstagramOAuthContext>) : null;
  } catch {
    // Reject malformed/legacy context rather than guessing the organization.
  }
  if (
    !context ||
    !state ||
    state !== context.state ||
    !organizationId ||
    organizationId !== context.organizationId ||
    !userId ||
    userId !== context.userId ||
    typeof context.createdAt !== "number" ||
    !Number.isFinite(context.createdAt) ||
    now < context.createdAt ||
    now - context.createdAt > IG_OAUTH_MAX_AGE_MS
  ) {
    throw new Error("Instagram connection context is no longer valid");
  }
  return context as InstagramOAuthContext;
}

export function instagramConnectionState(account: {
  status: string;
  extra?: { needs_reauth?: unknown } | null;
}): "connected" | "disconnected" | "needs_reauth" {
  if (account.extra?.needs_reauth) return "needs_reauth";
  return account.status === "connected" ? "connected" : "disconnected";
}
