import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const view = params.get('view') || 'pending';
    const requestType = params.get('requestType') || 'all';
    const result = await callFrappeMethod('get_hr_approval_inbox', {
      view,
      request_type: requestType,
    }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load HR approval inbox');
  }
}
