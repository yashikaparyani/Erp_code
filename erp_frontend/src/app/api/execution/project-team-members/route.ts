import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_project_team_members', {
      project: searchParams.get('project') || undefined,
      role: searchParams.get('role') || undefined,
      active: searchParams.get('active') || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch project team members', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod('update_project_team_member', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Team member updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_project_team_member', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Team member deleted' });
    }

    const result = await callFrappeMethod('create_project_team_member', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Team member created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
