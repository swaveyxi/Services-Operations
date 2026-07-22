export function iconForFile(name: string | undefined, mimeType?: string): string {
  const mime = mimeType ?? '';
  const lower = (name ?? '').toLowerCase();
  if (mime.includes('pdf') || lower.endsWith('.pdf')) return 'fa-file-pdf';
  if (/\.(docx?|rtf)$/.test(lower) || mime.includes('word')) return 'fa-file-word';
  if (/\.(xlsx?|csv)$/.test(lower) || mime.includes('sheet') || mime.includes('excel')) return 'fa-file-excel';
  if (/\.(pptx?)$/.test(lower) || mime.includes('presentation')) return 'fa-file-powerpoint';
  if (/\.(png|jpe?g|gif|bmp|svg)$/.test(lower) || mime.startsWith('image/')) return 'fa-file-image';
  return 'fa-file';
}
