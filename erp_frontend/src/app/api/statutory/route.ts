export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee') || '';
    const ledgerType = searchParams.get('ledger_type') || '';
    const paymentStatus = searchParams.get('payment_status') || '';

    const args: Record<string, string> = {};
    if (employee) args.employee = employee;
    if (ledgerType) args.ledger_type = ledgerType;
    if (paymentStatus) args.payment_status = paymentStatus;

    const result = await callFrappeMethod('get_statutory_ledgers', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load statutory ledgers', { data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_statutory_ledger', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Statutory ledger created' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create statutory ledger');
  }
}
