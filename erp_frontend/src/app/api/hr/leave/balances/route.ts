import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const employee = params.get('employee') || undefined;
    const fromDate = params.get('fromDate') || undefined;
    const toDate = params.get('toDate') || undefined;
    const result = await callFrappeMethod('get_leave_balances', { employee, from_date: fromDate, to_date: toDate }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load leave balances');
  }
}
