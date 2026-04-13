export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '';
    const department = searchParams.get('department') || '';

    const args: Record<string, string> = {};
    if (month) args.month = month;
    if (department) args.department = department;

    const result = await callFrappeMethod('get_attendance_muster', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch muster data', { data: [] });
  }
}
