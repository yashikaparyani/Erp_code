import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_commissioning_checklists', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch commissioning checklists', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'start') {
      const result = await callFrappeMethod('start_commissioning_checklist', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Commissioning checklist started' });
    }
    if (action === 'complete') {
      const result = await callFrappeMethod('complete_commissioning_checklist', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Commissioning checklist completed' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_commissioning_checklist', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Commissioning checklist updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_commissioning_checklist', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Commissioning checklist deleted' });
    }

    const result = await callFrappeMethod('create_commissioning_checklist', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Commissioning checklist created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
