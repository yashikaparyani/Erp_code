export function getFileProxyUrl(fileUrl?: string | null, download = false): string {
  let value = (fileUrl || '').trim();
  if (!value) return '';
  
  // If already using /api/files gateway, return as-is
  if (value.startsWith('/api/files?')) return value;
  if (value.startsWith('blob:') || value.startsWith('data:')) return value;

  // Normalize file paths: convert /Files/ to /files/, /Private/files/ to /private/files/ for consistency
  const lower = value.toLowerCase();
  if (lower.startsWith('/files/')) {
    value = '/files/' + value.substring(7);
  } else if (lower.startsWith('/private/files/')) {
    value = '/private/files/' + value.substring(15);
  }

  const params = new URLSearchParams({ url: value });
  if (download) params.set('download', '1');
  return `/api/files?${params.toString()}`;
}
