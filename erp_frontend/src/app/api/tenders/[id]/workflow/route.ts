import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    if (action === 'qualify') {
      const result = await callPresalesMethod(
        'set_tender_qualification',
        { name: tenderName, qualified: 1, reason: body.reason || '' },
        request,
      );
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender qualified' });
    }

    if (action === 'reject_qualification') {
      const result = await callPresalesMethod(
        'set_tender_qualification',
        { name: tenderName, qualified: 0, reason: body.reason || '' },
        request,
      );
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Qualification rejected' });
    }

    if (action === 'observe') {
      const result = await callPresalesMethod(
        'mark_tender_under_observation',
        { name: tenderName, reason: body.reason || '' },
        request,
      );
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender moved under observation' });
    }

    if (action === 'clear_observation') {
      const result = await callPresalesMethod('clear_tender_observation', { name: tenderName }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Observation cleared' });
    }

    if (action === 'convert_to_bid') {
      const result = await callPresalesMethod('convert_tender_to_bid', { name: tenderName }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Bid created' });
    }

    return NextResponse.json({ success: false, message: `Unsupported workflow action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to process tender workflow action' },
      { status: 500 },
    );
  }
}
