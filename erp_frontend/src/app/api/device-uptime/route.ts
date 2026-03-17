import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('site')) args.site = sp.get('site')!;
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('device_type')) args.device_type = sp.get('device_type')!;
    if (sp.get('sla_status')) args.sla_status = sp.get('sla_status')!;
    const result = await callFrappeMethod('get_device_uptime_logs', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch device uptime logs', data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_device_uptime_log', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Device uptime log created' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed to create device uptime log' }, { status: 500 });
  }
}
