export const HISTORY_PAGE_SIZE = 30;

export type HistoryCursor = { timestamp: string; id: string };

export function olderMessagesFilter(cursor: HistoryCursor): string {
  // Cursor values come from database rows, never from authored message text.
  if (
    !/^[0-9a-f-]{36}$/i.test(cursor.id) ||
    !/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(cursor.timestamp)
  ) {
    throw new Error("Invalid message history cursor");
  }
  return `timestamp.lt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.lt.${cursor.id})`;
}

export function nextHistoryCursor(
  rows: HistoryCursor[],
): HistoryCursor | undefined {
  return rows.length === HISTORY_PAGE_SIZE ? rows.at(-1) : undefined;
}

export function isNearChatBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= 80;
}
