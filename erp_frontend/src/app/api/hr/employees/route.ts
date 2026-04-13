export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';
    const designation = searchParams.get('designation') || '';
    const branch = searchParams.get('branch') || '';
    const search = searchParams.get('search') || '';
    const include_stats = searchParams.get('include_stats') === '1';

    const promises: Promise<any>[] = [
      callFrappeMethod(
        'get_employees',
        { status, department, designation, branch, search },
        request,
      ),
    ];

    if (include_stats) {
      promises.push(callFrappeMethod('get_employee_stats', undefined, request));
    }

    const results = await Promise.all(promises);

    const response: Record<string, any> = { success: true, data: results[0].data || [] };
    if (include_stats && results[1]) {
      response.stats = results[1].data || {};
    }

    return NextResponse.json(response);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch employees', { data: [] });
  }
}
