import { redirect } from 'next/navigation';

export default async function OMHelpdeskProjectWorkspacePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  redirect(`/om-helpdesk?project=${encodeURIComponent(decodeURIComponent(id || ''))}`);
}
