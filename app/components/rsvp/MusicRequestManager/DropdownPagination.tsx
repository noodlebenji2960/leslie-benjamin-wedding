// Compact pagination for inside the dropdown
import { Button } from "@/components/Button";

interface DropdownPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const DropdownPagination: React.FC<DropdownPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const getPages = (): (number | "…")[] => {
    const delta = 1;
    const range: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }
    const result: (number | "…")[] = [];
    let prev: number | null = null;
    for (const i of range) {
      if (prev !== null && i - prev === 2) result.push(prev + 1);
      else if (prev !== null && i - prev > 2) result.push("…");
      result.push(i);
      prev = i;
    }
    return result;
  };

  return (
    <div className="dd-pagination">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </Button>
      <div>
        {getPages().map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="dd-pagination__ellipsis">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant="secondary"
              size="sm"
              selected={p === currentPage}
              onClick={() => typeof p === "number" && onPageChange(p)}
              disabled={p === currentPage}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </Button>
    </div>
  );
};

export default DropdownPagination;
