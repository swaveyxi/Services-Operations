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

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(iso)} ${hh}:${min}`;
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

/* Turns an API slug or enum value into a readable name — handles
   snake_case ("dragnet_screening"), PascalCase ("DragnetScreening"), and
   ALL_CAPS enums ("NIN_VERIFIED") uniformly. Short (<=3 char) segments that
   are already all-uppercase are treated as acronyms (e.g. "FOT", "NIN",
   "SMS") and left as-is; everything else is title-cased. */
export function humanizeSlug(value: string | null | undefined): string {
  if (!value) return '—';
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[_\s-]+/)
    .filter(Boolean);
  return words
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}
