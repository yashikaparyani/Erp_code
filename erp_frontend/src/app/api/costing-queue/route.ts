import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/costing-queue?status=...&source_type=...&project=...
 * Returns costing queue entries created after PH approval.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('status')) args.status = sp.get('status')!;
    if (sp.get('source_type')) args.source_type = sp.get('source_type')!;
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('limit_page_length')) args.limit_page_length = sp.get('limit_page_length')!;
    if (sp.get('limit_start')) args.limit_start = sp.get('limit_start')!;

    const result = await callFrappeMethod('get_costing_queue', args, request);
    return NextResponse.json({ success: true, data: result.data || [], stats: result.stats || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch costing queue');
  }
}
