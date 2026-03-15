import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod(
      'get_dpr_stats',
      {
        project: searchParams.get('project') || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch DPR stats', data: {} },
      { status: 500 },
    );
  }
}
