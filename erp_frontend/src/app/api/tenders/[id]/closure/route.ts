import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

// POST /api/tenders/[id]/closure  — O&M letter + final presales closure
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action as 'om_letter' | 'close';

    if (action === 'om_letter') {
      const result = await callPresalesMethod('record_om_completion_letter', {
        tender_name: params.id,
        completion_date: body.completion_date,
      }, request);
      return NextResponse.json({ success: true, message: result.message });
    }

    if (action === 'close') {
      const result = await callPresalesMethod('mark_tender_closure', {
        tender_name: params.id,
        closure_date: body.closure_date,
        remarks: body.remarks,
      }, request);
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ success: false, message: 'Unknown action. Use om_letter or close.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
