import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_dependency_rules', {
      task: searchParams.get('task') || '',
      active: searchParams.get('active') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch dependency rules', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod('update_dependency_rule', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Dependency rule updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_dependency_rule', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Dependency rule deleted' });
    }

    const result = await callFrappeMethod('create_dependency_rule', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Dependency rule created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
