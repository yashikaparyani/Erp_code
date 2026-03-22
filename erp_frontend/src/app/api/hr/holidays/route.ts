import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const company = request.nextUrl.searchParams.get('company') || undefined;
    const result = await callFrappeMethod('get_holiday_lists', { company }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load holiday lists');
  }
}
