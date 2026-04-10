import { redirect } from 'next/navigation';

export default async function ExecutionProjectWorkspacePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  redirect(`/execution?project=${encodeURIComponent(decodeURIComponent(id || ''))}`);
}
