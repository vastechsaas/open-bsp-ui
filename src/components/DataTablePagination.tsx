import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  clampDataTablePage,
  DATA_TABLE_PAGE_SIZE_OPTIONS,
  getDataTablePageCount,
} from "@/utils/DataTableUtils";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export default function DataTablePagination({
  page,
  pageSize,
  total,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const { translate: t } = useTranslation();
  const pageCount = getDataTablePageCount(total, pageSize);
  const currentPage = clampDataTablePage(page, total, pageSize);

  useEffect(() => {
    if (currentPage !== page) onPageChange(currentPage);
  }, [currentPage, onPageChange, page]);

  return (
    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-[12px]">
      <label className="flex items-center gap-[7px]">
        <span className="hidden sm:inline">{t("Filas por página")}</span>
        <select
          className="h-[34px] rounded-lg border border-border bg-background px-[8px] text-[12px] text-foreground"
          value={pageSize}
          disabled={disabled}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {DATA_TABLE_PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          className="p-[7px] border border-border rounded-lg disabled:opacity-40"
          aria-label={t("Página anterior")}
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="w-[15px] h-[15px]" />
        </button>
        <span className="min-w-[52px] text-center text-foreground">
          {currentPage} / {pageCount}
        </span>
        <button
          type="button"
          className="p-[7px] border border-border rounded-lg disabled:opacity-40"
          aria-label={t("Página siguiente")}
          disabled={disabled || currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="w-[15px] h-[15px]" />
        </button>
      </div>
    </div>
  );
}
