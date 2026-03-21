import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const bid = request.nextUrl.searchParams.get('bid') || '';
    const result = await callPresalesMethod('get_loi_status', { bid }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed', data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callPresalesMethod('create_loi_tracker', {
      bid: body.bid,
      department: body.department,
      loi_expected_by: body.loi_expected_by,
      remarks: body.remarks,
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
