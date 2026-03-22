import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get('status') || undefined;
    const company = params.get('company') || undefined;
    const search = params.get('search') || undefined;

    const result = await callFrappeMethod('get_onboardings', { status, company, search }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load onboardings');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_onboarding', { data: JSON.stringify(body) }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create onboarding record');
  }
}
