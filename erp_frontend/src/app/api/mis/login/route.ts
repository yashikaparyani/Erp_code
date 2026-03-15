import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';
    const user = searchParams.get('user') || '';
    const result = await callFrappeMethod('get_login_mis', { from_date, to_date, user }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching login MIS:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch login MIS', data: [] },
      { status: 500 }
    );
  }
}
