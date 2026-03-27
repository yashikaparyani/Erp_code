import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../../_lib/frappe';

const ACTION_METHODS: Record<string, string> = {
  submit: 'submit_pm_request',
  approve: 'approve_pm_request',
  reject: 'reject_pm_request',
  withdraw: 'withdraw_pm_request',
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const method = ACTION_METHODS[action];

    if (!method) {
      return NextResponse.json({ success: false, message: 'Unsupported PM request action' }, { status: 400 });
    }

    const args: Record<string, unknown> = { name: decodeURIComponent(id) };
    if ((action === 'approve' || action === 'reject') && typeof body.remarks === 'string') {
      args.remarks = body.remarks;
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to run PM request action');
  }
}
