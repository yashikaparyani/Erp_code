import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestType = typeof body.requestType === 'string' ? body.requestType : '';
    const name = typeof body.name === 'string' ? body.name : '';
    const action = typeof body.action === 'string' ? body.action : '';
    const remarks = typeof body.remarks === 'string' ? body.remarks : undefined;

    if (!requestType || !name || !action) {
      return NextResponse.json({ success: false, message: 'requestType, name, and action are required' }, { status: 400 });
    }

    const result = await callFrappeMethod(
      'act_on_hr_approval',
      { request_type: requestType, name, action, remarks },
      request,
    );

    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to action HR approval item');
  }
}
