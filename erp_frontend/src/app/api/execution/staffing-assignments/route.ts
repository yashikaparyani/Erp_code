import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_staffing_assignments', {
      project: searchParams.get('project') || undefined,
      site: searchParams.get('site') || undefined,
      position: searchParams.get('position') || undefined,
      is_active: searchParams.get('is_active') || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch staffing assignments', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, leave_date, remarks, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod(
        'update_staffing_assignment',
        { name, data: JSON.stringify(rest.data || rest) },
        request,
      );
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Staffing assignment updated' });
    }

    if (action === 'delete') {
      const result = await callFrappeMethod('delete_staffing_assignment', { name }, request);
      return NextResponse.json({ success: true, message: result.message || 'Staffing assignment deleted' });
    }

    if (action === 'end') {
      const result = await callFrappeMethod(
        'end_staffing_assignment',
        { name, leave_date: leave_date || undefined, remarks: remarks || undefined },
        request,
      );
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Staffing assignment ended' });
    }

    const result = await callFrappeMethod('create_staffing_assignment', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Staffing assignment created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to save staffing assignment' },
      { status: 500 },
    );
  }
}
