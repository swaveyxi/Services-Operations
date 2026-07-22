export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--c-border)',
        background: 'var(--c-surface)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--page-max-7xl)',
          margin: '0 auto',
          padding: '12px var(--page-gutter)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
          © 2026 Dragnet Solutions Limited. Internal Use Only.
        </span>
      </div>
    </footer>
  );
}
