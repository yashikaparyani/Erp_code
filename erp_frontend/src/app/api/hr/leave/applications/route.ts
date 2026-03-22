import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const employee = params.get('employee') || undefined;
    const status = params.get('status') || undefined;
    const leaveType = params.get('leaveType') || undefined;
    const fromDate = params.get('fromDate') || undefined;
    const toDate = params.get('toDate') || undefined;
    const result = await callFrappeMethod('get_leave_applications', {
      employee,
      status,
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
    }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load leave applications');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_leave_application', { data: JSON.stringify(body) }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create leave application');
  }
}
