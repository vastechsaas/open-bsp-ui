export function isSignInPath(pathname: string) {
  return /^\/login(?:\/|$)/i.test(pathname);
}

/** Only accept a root-relative app URL. Preserve its query and fragment. */
export function safeSignInRedirect(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n\t]/.test(value)
  )
    return undefined;

  try {
    const base = "https://app.invalid";
    const url = new URL(value, base);
    const decoded = decodeURIComponent(url.pathname);
    const path = new URL(decoded, base);
    if (
      url.origin !== base ||
      path.origin !== base ||
      url.pathname.startsWith("//") ||
      decoded.startsWith("//") ||
      isSignInPath(path.pathname)
    )
      return undefined;

    return url.pathname + url.search + url.hash;
  } catch {
    return undefined;
  }
}

export function signInErrorMessage(error: {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}) {
  if (
    error.code === "invalid_credentials" ||
    error.message === "Invalid login credentials"
  )
    return "El correo electrónico o la contraseña son incorrectos.";
  if (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    error.status === 429 ||
    (error.status !== undefined && error.status >= 500)
  )
    return "No se pudo conectar. Inténtalo de nuevo en unos momentos.";
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}
