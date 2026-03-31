import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/approval-hub?tab=po|rma_po|petty_cash&project=...&status=...
 * Returns items pending PH approval (or history) for the given tab.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('tab')) args.tab = sp.get('tab')!;
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('status')) args.status = sp.get('status')!;
    if (sp.get('limit_page_length')) args.limit_page_length = sp.get('limit_page_length')!;
    if (sp.get('limit_start')) args.limit_start = sp.get('limit_start')!;

    const result = await callFrappeMethod('get_ph_approval_items', args, request);
    return NextResponse.json({ success: true, data: result.data || [], stats: result.stats || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch approval hub items');
  }
}
