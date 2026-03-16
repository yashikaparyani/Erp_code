import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_technical_deviations', {
      project: searchParams.get('project') || '',
      drawing: searchParams.get('drawing') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch technical deviations', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'approve') {
      const result = await callFrappeMethod('approve_technical_deviation', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Technical deviation approved' });
    }
    if (action === 'reject') {
      const result = await callFrappeMethod('reject_technical_deviation', { name, reason: rest.reason || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Technical deviation rejected' });
    }
    if (action === 'close') {
      const result = await callFrappeMethod('close_technical_deviation', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Technical deviation closed' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_technical_deviation', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Technical deviation updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_technical_deviation', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Technical deviation deleted' });
    }

    // Default: create
    const result = await callFrappeMethod('create_technical_deviation', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Technical deviation created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
