import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tender = request.nextUrl.searchParams.get('tender') || '';
    const project = request.nextUrl.searchParams.get('project') || '';
    const site = request.nextUrl.searchParams.get('site') || '';
    if (!tender && !project && !site) {
      return NextResponse.json(
        { success: false, message: 'One of "tender", "project", or "site" is required', data: {} },
        { status: 400 },
      );
    }

    const result = await callFrappeMethod('check_survey_complete', { tender, project, site }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to check survey completion', data: {} },
      { status: 500 },
    );
  }
}
