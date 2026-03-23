import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const employee = params.get('employee') || undefined;
    const status = params.get('status') || undefined;
    const regularizationDate = params.get('regularizationDate') || undefined;
    const result = await callFrappeMethod('get_attendance_regularizations', {
      employee,
      status,
      regularization_date: regularizationDate,
    }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load regularizations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_attendance_regularization', { data: JSON.stringify(body) }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create regularization');
  }
}
