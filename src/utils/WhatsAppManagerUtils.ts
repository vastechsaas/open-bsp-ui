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
    .filter((item) => item.service === "whatsapp")
    .sort((left, right) => {
      const connectedDifference =
        Number(right.status === "connected") -
        Number(left.status === "connected");
      return connectedDifference || left.address.localeCompare(right.address);
    })[0];
}
