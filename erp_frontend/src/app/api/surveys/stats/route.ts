import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_survey_stats', undefined, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch survey stats', data: {} },
      { status: 500 },
    );
  }
}
