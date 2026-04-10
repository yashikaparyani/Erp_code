export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || '';
    const result = await callPresalesMethod('get_department_loi_requests', { status }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch department LOIs', data: [] },
      { status: 500 },
    );
  }
}
