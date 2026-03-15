import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, message: 'Request name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('deny_finance_request', {
      name: body.name,
      reason: body.reason || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error denying finance request:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to deny' },
      { status: 500 }
    );
  }
}
