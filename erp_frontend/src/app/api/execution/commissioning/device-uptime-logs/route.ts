import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_device_uptime_logs', {
      site: searchParams.get('site') || '',
      project: searchParams.get('project') || '',
      device_type: searchParams.get('device_type') || '',
      sla_status: searchParams.get('sla_status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch device uptime logs', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod('update_device_uptime_log', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Uptime log updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_device_uptime_log', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Uptime log deleted' });
    }

    const result = await callFrappeMethod('create_device_uptime_log', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Uptime log created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
