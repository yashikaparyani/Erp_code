import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ACTION_TO_METHOD: Record<string, string> = {
  submit: 'submit_invoice',
  approve: 'approve_invoice',
  reject: 'reject_invoice',
  mark_paid: 'mark_invoice_paid',
  cancel: 'cancel_invoice',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const invoiceName = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();
    const method = ACTION_TO_METHOD[action];

    if (!method) {
      return NextResponse.json({ success: false, message: `Unsupported action: ${action}` }, { status: 400 });
    }

    const args: Record<string, any> = { name: invoiceName };
    if (action === 'reject') {
      args.reason = String(body?.reason || 'Rejected from billing panel');
    }
    if (action === 'cancel') {
      args.reason = String(body?.reason || 'Cancelled from billing panel');
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || `Action ${action} completed` });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Invoice action failed' },
      { status: 500 },
    );
  }
}
