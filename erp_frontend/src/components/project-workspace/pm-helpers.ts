/**
 * Shared helper for PM workspace tab components.
 * Re-exports the callOps function used by WorkspaceShell tabs.
 */

export async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/project-workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load data');
  }
  return (payload.data ?? payload) as T;
}
