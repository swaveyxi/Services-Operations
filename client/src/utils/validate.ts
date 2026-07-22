function err(field: string, msg: string): never {
  throw new Error(`[${field}] ${msg}`);
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim())
    err(field, 'must be a non-empty string');
  return value.trim();
}

export function requireId(value: unknown, field: string): string {
  return requireString(value, field);
}

export function requireEmail(value: unknown, field: string): string {
  const s = requireString(value, field);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) err(field, `"${s}" is not a valid email address`);
  return s;
}

export function requireUrl(value: unknown, field: string): string {
  const s = requireString(value, field);
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:')
      err(field, `"${s}" must use http or https`);
  } catch {
    err(field, `"${s}" is not a valid URL`);
  }
  return s;
}

export function requireNonEmpty<T>(arr: T[], field: string): T[] {
  if (!Array.isArray(arr) || arr.length === 0) err(field, 'must contain at least one item');
  return arr;
}
