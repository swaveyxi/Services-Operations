function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Generate {ABBR}/{MONTH}/{YEAR}, auto-incrementing the suffix against existing ids. */
export function generateCampaignId(
  abbreviation: string,
  existingIds: string[],
  now: Date = new Date(),
): string {
  const month = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const year = now.getFullYear();
  const prefix = abbreviation
    .trim()
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!prefix) return '';

  const re = new RegExp('^' + escapeRegExp(prefix) + '(\\d*)/' + month + '/' + year + '$', 'i');
  let maxSuffix = 0;
  let hasMatch = false;
  for (const id of existingIds) {
    const m = typeof id === 'string' ? re.exec(id) : null;
    if (!m) continue;
    hasMatch = true;
    const n = m[1] ? parseInt(m[1], 10) : 0;
    if (!Number.isNaN(n)) maxSuffix = Math.max(maxSuffix, n);
  }
  if (!hasMatch) return `${prefix}/${month}/${year}`;
  const next = maxSuffix === 0 ? 2 : maxSuffix + 1;
  return `${prefix}${next}/${month}/${year}`;
}

/* New-client contact id, prefixed "new-" to distinguish from QuickBooks integer ids. */
export function generateClientContactId(): string {
  return 'new-' + Math.floor(100000000 + Math.random() * 1000000000);
}
