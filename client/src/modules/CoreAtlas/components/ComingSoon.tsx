export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> {label} — coming soon.
    </div>
  );
}
