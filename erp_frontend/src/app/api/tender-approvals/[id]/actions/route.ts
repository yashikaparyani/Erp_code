import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const approvalName = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();
    const remarks = String(body?.remarks || '').trim();

    if (action === 'approve') {
      const result = await callFrappeMethod('approve_tender_approval', { name: approvalName, remarks }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender approval approved' });
    }

    if (action === 'reject') {
      const result = await callFrappeMethod('reject_tender_approval', { name: approvalName, remarks }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender approval rejected' });
    }

    return NextResponse.json({ success: false, message: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to process tender approval action' },
      { status: 500 },
    );
  }
}
