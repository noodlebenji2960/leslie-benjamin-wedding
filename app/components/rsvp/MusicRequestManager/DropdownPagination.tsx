// Compact pagination for inside the dropdown
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
      <button
        className="dd-pagination__btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {getPages().map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="dd-pagination__ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`dd-pagination__btn${p === currentPage ? " dd-pagination__btn--active" : ""}`}
            onClick={() => typeof p === "number" && onPageChange(p)}
            disabled={p === currentPage}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="dd-pagination__btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
};

export default DropdownPagination;