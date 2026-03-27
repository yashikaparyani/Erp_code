import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ACTION_TO_METHOD: Record<string, string> = {
  approve: 'approve_sla_penalty',
  reject: 'reject_sla_penalty',
  waive: 'waive_sla_penalty',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const penaltyName = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();
    const method = ACTION_TO_METHOD[action];

    if (!method) {
      return NextResponse.json({ success: false, message: `Unsupported action: ${action}` }, { status: 400 });
    }

    const payload: Record<string, string> = { name: penaltyName };
    if (body.reason) payload.reason = body.reason;

    const result = await callFrappeMethod(method, payload, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || `Action ${action} completed` });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'SLA penalty action failed' },
      { status: 500 },
    );
  }
}
