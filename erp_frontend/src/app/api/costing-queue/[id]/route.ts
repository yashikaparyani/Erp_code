import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/costing-queue/[id] — fetch single costing queue entry detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_costing_queue_item', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch costing queue item');
  }
}

/**
 * POST /api/costing-queue/[id] — costing actions: release, hold, reject
 * Body: { action: 'release' | 'hold' | 'reject', remarks?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const { action, remarks } = await request.json();

    const METHOD_MAP: Record<string, string> = {
      release: 'costing_release_item',
      hold: 'costing_hold_item',
      reject: 'costing_reject_item',
    };

    const method = METHOD_MAP[action];
    if (!method) {
      return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await callFrappeMethod(method, { name, remarks: remarks || '' }, request);
    return NextResponse.json({ success: true, data: result?.data, message: result?.message });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to perform costing action');
  }
}
