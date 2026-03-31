import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/purchase-orders/submit-to-ph
 * Submits a finalized PO to the Project Head approval queue.
 * Body: { name: string, remarks?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { name, remarks } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, message: 'PO name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod(
      'submit_po_to_ph',
      { name, remarks: remarks || '' },
      request,
    );
    return NextResponse.json({
      success: true,
      data: result?.data,
      message: result?.message || `PO ${name} submitted to Project Head for approval`,
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to submit PO to Project Head');
  }
}
