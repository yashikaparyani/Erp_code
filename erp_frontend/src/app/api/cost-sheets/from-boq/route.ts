export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const boq_name = String(body?.boq_name || '').trim();

    if (!boq_name) {
      return NextResponse.json({ success: false, message: 'boq_name is required' }, { status: 400 });
    }

    const result = await callFrappeMethod('create_cost_sheet_from_boq', { boq_name }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Cost sheet created from BOQ' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create cost sheet from BOQ');
  }
}
