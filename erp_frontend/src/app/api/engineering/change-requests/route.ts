import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_change_requests', {
      project: searchParams.get('project') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch change requests', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'submit') {
      const result = await callFrappeMethod('submit_change_request', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Change request submitted' });
    }
    if (action === 'approve') {
      const result = await callFrappeMethod('approve_change_request', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Change request approved' });
    }
    if (action === 'reject') {
      const result = await callFrappeMethod('reject_change_request', { name, reason: rest.reason || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Change request rejected' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_change_request', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Change request updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_change_request', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Change request deleted' });
    }

    const result = await callFrappeMethod('create_change_request', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Change request created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
