import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/petty-cash/fund-requests?project=...&status=...
 * Returns petty cash fund requests (PH-bound).
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('status')) args.status = sp.get('status')!;

    const result = await callFrappeMethod('get_petty_cash_fund_requests', args, request);
    return NextResponse.json({ success: true, data: result.data || [], stats: result.stats || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch fund requests');
  }
}

/**
 * POST /api/petty-cash/fund-requests — create a new fund request
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_petty_cash_fund_request', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Fund request created' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create fund request');
  }
}
