import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tender = request.nextUrl.searchParams.get('tender');
    if (!tender) {
      return NextResponse.json(
        { success: false, message: 'Query parameter "tender" is required', data: {} },
        { status: 400 },
      );
    }

    const result = await callFrappeMethod('check_survey_complete', { tender }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to check survey completion', data: {} },
      { status: 500 },
    );
  }
}
