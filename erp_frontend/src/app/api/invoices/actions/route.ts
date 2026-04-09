import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

const GLOBAL_ACTIONS: Record<string, string> = {
  reconcile: 'reconcile_invoice_payments',
};

const ROW_ACTIONS: Record<string, string> = {
  submit: 'submit_invoice',
  approve: 'approve_invoice',
  reject: 'reject_invoice',
  mark_paid: 'mark_invoice_paid',
  cancel: 'cancel_invoice',
  delete: 'delete_invoice',
};

/**
 * POST /api/invoices/actions
 * Body: { action: string, name?: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();
    const name = body?.name as string | undefined;

    // Global actions (no name required)
    const globalMethod = GLOBAL_ACTIONS[action];
    if (globalMethod) {
      const result = await callFrappeMethod(globalMethod, {}, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || `${action} completed` });
    }

    // Row-level actions (require name)
    const rowMethod = ROW_ACTIONS[action];
    if (!rowMethod) {
      return NextResponse.json({ success: false, message: `Unsupported action: ${action}` }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, message: 'name is required for this action' }, { status: 400 });
    }

    const args: Record<string, string> = { name };
    if (body?.reason) args.reason = String(body.reason);

    const result = await callFrappeMethod(rowMethod, args, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || `${action} completed` });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Invoice action failed' },
      { status: 500 },
    );
  }
}
