export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendance_date = searchParams.get('attendance_date') || '';
    const department = searchParams.get('department') || '';

    const args: Record<string, string> = {};
    if (attendance_date) args.attendance_date = attendance_date;
    if (department) args.department = department;

    const result = await callFrappeMethod('get_who_is_in', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch who-is-in data', { data: [] });
  }
}
