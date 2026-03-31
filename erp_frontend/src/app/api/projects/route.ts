import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_project_spine_list', {
      department: searchParams.get('department') || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch projects', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_project', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Project created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 },
    );
  }
}
