type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  noun?: string;
  onPage: (p: number) => void;
};

/* Windowed pagination: first, last, and current ±1 with ellipses. */
export function Pager({ page, pageSize, totalItems, noun = 'items', onPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <div className="pager">
      <span className="pager-summary">
        Showing {from}–{to} of {totalItems} {noun}
      </span>
      <div className="pager-controls">
        <button className="pager-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>
          ‹ Prev
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="pager-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`pager-btn ${p === page ? 'is-active' : ''}`}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          className="pager-btn"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
