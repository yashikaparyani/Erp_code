import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_drawings', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      status: searchParams.get('status') || '',
      client_approval_status: searchParams.get('client_approval_status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch drawings', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'submit') {
      const result = await callFrappeMethod('submit_drawing', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Drawing submitted' });
    }
    if (action === 'approve') {
      const result = await callFrappeMethod('approve_drawing', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Drawing approved' });
    }
    if (action === 'supersede') {
      const result = await callFrappeMethod('supersede_drawing', { name, superseded_by: rest.superseded_by || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Drawing superseded' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_drawing', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Drawing updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_drawing', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Drawing deleted' });
    }

    const result = await callFrappeMethod('create_drawing', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Drawing created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
