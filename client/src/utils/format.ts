/* Display formatting helpers. */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/* Friendlier, more legible variant for report headers/timestamps ("12 Sep 2026"
   rather than "12-09-2026"). */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0)) || 0;
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Case-insensitive equality for status/unit comparisons (stored casing varies). */
export function ciEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
}

/* Normalise stored values (which vary in casing) to Title Case for display. */
export function titleCase(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
