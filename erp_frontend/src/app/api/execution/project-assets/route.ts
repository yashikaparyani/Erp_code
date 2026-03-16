import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_project_assets', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      asset_type: searchParams.get('asset_type') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch project assets', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod('update_project_asset', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Project asset updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_project_asset', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Project asset deleted' });
    }

    const result = await callFrappeMethod('create_project_asset', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Project asset created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
