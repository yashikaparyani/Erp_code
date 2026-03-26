import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS: Record<string, string> = {
  approve: 'approve_rma',
  reject: 'reject_rma',
  close: 'close_rma',
  update_status: 'update_rma_status',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const body = await request.json();
    const { action, ...extra } = body;
    const method = ALLOWED_ACTIONS[action];
    if (!method) return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    const result = await callFrappeMethod(method, { name, ...extra }, request);
    return NextResponse.json({ success: true, data: result.data || result, message: `${action} completed` });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Action failed' }, { status: 500 });
  }
}
