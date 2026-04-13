import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get('status') || undefined;
    const company = params.get('company') || undefined;
    const search = params.get('search') || undefined;
    const include_stats = params.get('include_stats') === '1';

    const promises: Promise<any>[] = [
      callFrappeMethod('get_onboardings', { status, company, search }, request),
    ];

    if (include_stats) {
      promises.push(callFrappeMethod('get_onboarding_stats', undefined, request));
    }

    const results = await Promise.all(promises);

    const response: Record<string, any> = { success: true, data: results[0].data || [] };
    if (include_stats && results[1]) {
      response.stats = results[1].data || {};
    }

    return NextResponse.json(response);
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
