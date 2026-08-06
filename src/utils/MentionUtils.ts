export type ActiveMention = {
  start: number;
  end: number;
  query: string;
};

export function findActiveMention(
  text: string,
  cursor: number,
): ActiveMention | null {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const prefix = text.slice(0, safeCursor);
  const match = /(?:^|\s)@([^\s@]*)$/.exec(prefix);

  if (!match || match.index === undefined) return null;

  const atOffset = match[0].lastIndexOf("@");
  const start = match.index + atOffset;

  return {
    start,
    end: safeCursor,
    query: match[1],
  };
}

export function insertMention(
  text: string,
  mention: ActiveMention,
  displayName: string,
) {
  const inserted = `@${displayName} `;
  const nextText =
    text.slice(0, mention.start) + inserted + text.slice(mention.end);

  return {
    text: nextText,
    cursor: mention.start + inserted.length,
  };
}

export function addMentionedAgentId(ids: string[], agentId: string) {
  return ids.includes(agentId) ? ids : [...ids, agentId];
}
