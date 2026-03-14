import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_competitors', {
      tender: searchParams.get('tender') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch competitors', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_competitor', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Competitor created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create competitor' },
      { status: 500 },
    );
  }
}
