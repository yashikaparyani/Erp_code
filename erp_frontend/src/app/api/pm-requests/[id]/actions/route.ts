import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (!action) {
      return NextResponse.json({ success: false, message: 'Unsupported PM request action' }, { status: 400 });
    }

    const args: Record<string, unknown> = { name: decodeURIComponent(id) };
    if ((action === 'approve' || action === 'reject') && typeof body.remarks === 'string') {
      args.remarks = body.remarks;
    }

    let result;
    switch (action) {
      case 'submit':
        result = await callFrappeMethod('submit_pm_request', args, request);
        break;
      case 'approve':
        result = await callFrappeMethod('approve_pm_request', args, request);
        break;
      case 'reject':
        result = await callFrappeMethod('reject_pm_request', args, request);
        break;
      case 'withdraw':
        result = await callFrappeMethod('withdraw_pm_request', args, request);
        break;
      default:
        return NextResponse.json({ success: false, message: 'Unsupported PM request action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to run PM request action');
  }
}
