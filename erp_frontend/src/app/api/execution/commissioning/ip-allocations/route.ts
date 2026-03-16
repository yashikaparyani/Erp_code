import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_ip_allocations', {
      pool: searchParams.get('pool') || '',
      device: searchParams.get('device') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch IP allocations', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'release') {
      const result = await callFrappeMethod('release_ip_allocation', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'IP allocation released' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_ip_allocation', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'IP allocation updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_ip_allocation', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'IP allocation deleted' });
    }

    const result = await callFrappeMethod('create_ip_allocation', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'IP allocation created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
