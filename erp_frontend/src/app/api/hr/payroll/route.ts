export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee') || '';
    const status = searchParams.get('status') || '';
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';
    const search = searchParams.get('search') || '';
    const include_stats = searchParams.get('include_stats') === '1';

    const calls: Promise<any>[] = [
      callFrappeMethod(
        'get_salary_slips',
        { employee, status, from_date, to_date, search },
        request,
      ),
    ];

    if (include_stats) {
      calls.push(callFrappeMethod('get_salary_slip_stats', { employee, from_date, to_date }, request));
    }

    const [slips, stats] = await Promise.all(calls);

    return NextResponse.json({
      success: true,
      data: slips.data || [],
      stats: stats?.data || undefined,
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch payroll records', { data: [] });
  }
}
