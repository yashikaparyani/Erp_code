import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { purchase_order, reason } = await request.json();
    const result = await callFrappeMethod('reject_po_payment_terms', { purchase_order, reason }, request);
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to reject payment terms' },
      { status: 500 },
    );
  }
}
