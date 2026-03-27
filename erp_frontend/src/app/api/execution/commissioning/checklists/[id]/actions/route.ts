import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

const ALLOWED_ACTIONS: Record<string, string> = {
  start: 'start_commissioning_checklist',
  complete: 'complete_commissioning_checklist',
  update: 'update_commissioning_checklist',
};

export const dynamic = 'force-dynamic';

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
    const args: Record<string, string> = { name };
    if (action === 'update' && extra.data) args.data = JSON.stringify(extra.data);
    const result = await callFrappeMethod(method, { ...args, ...extra }, request);
    return NextResponse.json({ success: true, data: result, message: `${action} completed` });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Action failed' }, { status: 500 });
  }
}
