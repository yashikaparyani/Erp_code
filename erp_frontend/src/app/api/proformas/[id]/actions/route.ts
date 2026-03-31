import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    const actionMap: Record<string, { method: string; message: string }> = {
      send: { method: 'submit_proforma_invoice', message: 'Proforma sent' },
      approve: { method: 'approve_proforma_invoice', message: 'Proforma approved' },
      cancel: { method: 'cancel_proforma_invoice', message: 'Proforma cancelled' },
      convert: { method: 'convert_proforma_to_invoice', message: 'Converted to invoice' },
    };

    const entry = actionMap[action];
    if (!entry) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const args: Record<string, any> = { name };
    if (action === 'cancel' && body?.reason) args.reason = String(body.reason);

    const result = await callFrappeMethod(entry.method, args, request);
    return NextResponse.json({ success: true, data: result.data, message: entry.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 },
    );
  }
}
