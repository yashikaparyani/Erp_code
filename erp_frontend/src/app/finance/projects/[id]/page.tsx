import { redirect } from 'next/navigation';

export default async function FinanceProjectWorkspacePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  redirect(`/finance?project=${encodeURIComponent(decodeURIComponent(id || ''))}`);
}
