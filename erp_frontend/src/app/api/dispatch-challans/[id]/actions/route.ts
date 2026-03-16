import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ACTION_TO_METHOD: Record<string, string> = {
  submit: 'submit_dispatch_challan_for_approval',
  approve: 'approve_dispatch_challan',
  reject: 'reject_dispatch_challan',
  dispatch: 'mark_dispatch_challan_dispatched',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const challanName = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();
    const method = ACTION_TO_METHOD[action];

    if (!method) {
      return NextResponse.json({ success: false, message: `Unsupported action: ${action}` }, { status: 400 });
    }

    const result = await callFrappeMethod(method, { name: challanName }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || `Action ${action} completed` });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Dispatch challan action failed' },
      { status: 500 },
    );
  }
}
