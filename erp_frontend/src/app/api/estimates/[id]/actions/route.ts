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
      send: { method: 'submit_estimate', message: 'Estimate sent' },
      approve: { method: 'approve_estimate', message: 'Estimate approved' },
      reject: { method: 'reject_estimate', message: 'Estimate rejected' },
      convert: { method: 'convert_estimate_to_proforma', message: 'Converted to proforma' },
      update: { method: 'update_estimate', message: 'Estimate updated' },
      delete: { method: 'delete_estimate', message: 'Estimate deleted' },
    };

    const entry = actionMap[action];
    if (!entry) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const args: Record<string, any> = { name };
    if (action === 'reject' && body?.reason) args.reason = String(body.reason);
    if (action === 'update' && body?.data) args.data = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);

    const result = await callFrappeMethod(entry.method, args, request);
    return NextResponse.json({ success: true, data: result.data, message: entry.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 },
    );
  }
}
