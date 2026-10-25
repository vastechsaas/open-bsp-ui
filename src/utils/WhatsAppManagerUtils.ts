type WhatsAppAddress = {
  address: string;
  service: string;
  status: string;
};

export function isWhatsAppManagerWorkspacePath(pathname: string) {
  return (pathname.replace(/\/$/, "") || "/") === "/whatsapp-manager";
}

export function selectWhatsAppManagerAccount<T extends WhatsAppAddress>(
  addresses: T[] | undefined,
) {
  return [...(addresses || [])]
    .filter(
      (item) => item.service === "whatsapp" && item.status === "connected",
    )
    .sort((left, right) => left.address.localeCompare(right.address))[0];
}
