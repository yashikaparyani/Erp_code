export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee') || '';
    const status = searchParams.get('status') || '';

    const args: Record<string, string> = {};
    if (employee) args.employee = employee;
    if (status) args.status = status;

    const result = await callFrappeMethod('get_overtime_entries', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch overtime entries', { data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_overtime_entry', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create overtime entry');
  }
}
