export function getFileProxyUrl(fileUrl?: string | null, download = false): string {
  const value = (fileUrl || '').trim();
  if (!value) return '';
  if (value.startsWith('/api/files?')) return value;
  if (value.startsWith('blob:') || value.startsWith('data:')) return value;

  const params = new URLSearchParams({ url: value });
  if (download) params.set('download', '1');
  return `/api/files?${params.toString()}`;
}
