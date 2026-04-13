export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee') || '';
    const status = searchParams.get('status') || '';
    const project = searchParams.get('project') || '';
    const site = searchParams.get('site') || '';

    const args: Record<string, string> = {};
    if (employee) args.employee = employee;
    if (status) args.status = status;
    if (project) args.project = project;
    if (site) args.site = site;

    const result = await callFrappeMethod('get_travel_logs', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch travel logs', { data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_travel_log', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create travel log');
  }
}
