import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/costing?status=...&source_type=...
 * GET /api/costing?name=...  (single item detail)
 * Typed wrapper for costing queue reads.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const name = sp.get('name');

    if (name) {
      // Single item detail
      const data = await callFrappeMethod('get_costing_queue_item', { name }, request);
      return NextResponse.json({ success: true, data });
    }

    // Queue list
    const args: Record<string, string> = {};
    if (sp.get('status')) args.status = sp.get('status')!;
    if (sp.get('source_type')) args.source_type = sp.get('source_type')!;

    const data = await callFrappeMethod('get_costing_queue', args, request);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'Failed to load costing queue');
  }
}

/**
 * POST /api/costing
 * { action: 'release' | 'hold' | 'reject', name: string, remarks?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, remarks } = body;

    if (!action || !name) {
      return NextResponse.json({ success: false, message: 'action and name are required' }, { status: 400 });
    }

    const methodMap: Record<string, string> = {
      release: 'costing_release_item',
      hold: 'costing_hold_item',
      reject: 'costing_reject_item',
    };

    const method = methodMap[action];
    if (!method) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const data = await callFrappeMethod(method, { name, remarks: remarks || '' }, request);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'Costing action failed');
  }
}
