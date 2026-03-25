import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_dependency_overrides', {
      task: searchParams.get('task') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch dependency overrides', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name } = body;

    if (action === 'approve') {
      const result = await callFrappeMethod('approve_dependency_override', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Dependency override approved' });
    }
    if (action === 'reject') {
      const result = await callFrappeMethod('reject_dependency_override', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Dependency override rejected' });
    }

    const result = await callFrappeMethod('create_dependency_override', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Dependency override created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
