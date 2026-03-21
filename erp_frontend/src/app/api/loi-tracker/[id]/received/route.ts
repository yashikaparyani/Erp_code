import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await callPresalesMethod('mark_loi_received', {
      name: params.id,
      loi_received_date: body.loi_received_date,
      loi_document: body.loi_document,
    }, request);
    return NextResponse.json({ success: true, data: result.data, loi_summary: result.loi_summary, message: result.message });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
