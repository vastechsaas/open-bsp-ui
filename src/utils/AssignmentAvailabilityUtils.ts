export function canSetConversationAvailability(
  role: string | undefined,
  invitationStatus: string | undefined,
) {
  return (
    (role === "agent" || role === "supervisor") &&
    (invitationStatus === undefined || invitationStatus === "accepted")
  );
}
