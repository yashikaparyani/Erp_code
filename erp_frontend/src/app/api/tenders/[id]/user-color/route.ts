export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

// Tender user-color assignment: PATCH /api/tenders/[id]/user-color
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await callPresalesMethod('assign_tender_user_color', {
      tender_name: params.id,
      slot: body.slot ?? '',
      remarks: body.remarks ?? '',
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
