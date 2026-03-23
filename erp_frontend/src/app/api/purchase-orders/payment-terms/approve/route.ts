import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { purchase_order } = await request.json();
    const result = await callFrappeMethod('approve_po_payment_terms', { purchase_order }, request);
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to approve payment terms' },
      { status: 500 },
    );
  }
}
