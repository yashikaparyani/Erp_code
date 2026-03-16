import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_ip_pools', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch IP pools', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod('update_ip_pool', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'IP pool updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_ip_pool', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'IP pool deleted' });
    }

    const result = await callFrappeMethod('create_ip_pool', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'IP pool created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
