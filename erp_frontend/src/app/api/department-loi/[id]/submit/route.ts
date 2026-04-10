export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await callPresalesMethod(
      'mark_loi_received',
      {
        name: decodeURIComponent(params.id),
        loi_received_date: body.loi_received_date || '',
        loi_document: body.loi_document || '',
        remarks: body.remarks || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'LOI submitted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to submit LOI' },
      { status: 500 },
    );
  }
}
