import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_surveys', {
      tender: searchParams.get('tender') || '',
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      status: searchParams.get('status') || '',
    }, request);

    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch surveys', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_survey', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Survey created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create survey' },
      { status: 500 },
    );
  }
}
