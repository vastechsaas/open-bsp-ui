export const DEFAULT_DATA_TABLE_PAGE_SIZE = 10;
export const DATA_TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type DataTablePageParams = {
  page: number;
  pageSize: number;
  search?: string;
};

export type DataTablePage<T> = {
  rows: T[];
  total: number;
};

export function getDataTablePageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export function clampDataTablePage(
  page: number,
  total: number,
  pageSize: number,
) {
  return Math.min(Math.max(1, page), getDataTablePageCount(total, pageSize));
}

export function getDataTablePageCorrection(
  page: number,
  total: number,
  pageSize: number,
  disabled: boolean,
) {
  if (disabled) return null;
  const correctedPage = clampDataTablePage(page, total, pageSize);
  return correctedPage === page ? null : correctedPage;
}
