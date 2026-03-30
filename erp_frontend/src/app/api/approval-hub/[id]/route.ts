import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/approval-hub/[id] — fetch single approval item detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_ph_approval_item', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch approval item');
  }
}

/**
 * POST /api/approval-hub/[id] — PH approve / reject
 * Body: { action: 'approve' | 'reject', remarks?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const { action, remarks } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
    }

    const method = action === 'approve' ? 'ph_approve_item' : 'ph_reject_item';
    const result = await callFrappeMethod(method, { name, remarks: remarks || '' }, request);
    return NextResponse.json({ success: true, data: result?.data, message: result?.message });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to perform approval action');
  }
}
