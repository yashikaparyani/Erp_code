import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_device_registers', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      device_type: searchParams.get('device_type') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch device registers', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'commission') {
      const result = await callFrappeMethod('commission_device', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Device commissioned' });
    }
    if (action === 'mark_faulty') {
      const result = await callFrappeMethod('mark_device_faulty', { name, remarks: rest.remarks || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Device marked faulty' });
    }
    if (action === 'decommission') {
      const result = await callFrappeMethod('decommission_device', { name, remarks: rest.remarks || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Device decommissioned' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_device_register', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Device register updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_device_register', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Device register deleted' });
    }

    const result = await callFrappeMethod('create_device_register', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Device register created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
