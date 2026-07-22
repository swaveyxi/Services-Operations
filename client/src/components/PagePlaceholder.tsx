export function PagePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{note ?? 'This page is being built in the next step.'}</p>
        </div>
      </div>
      <div className="empty-state">
        <i
          className="fa-solid fa-screwdriver-wrench"
          aria-hidden="true"
          style={{ fontSize: '1.4rem', marginBottom: 8, display: 'block' }}
        />
        Under construction.
      </div>
    </>
  );
}
