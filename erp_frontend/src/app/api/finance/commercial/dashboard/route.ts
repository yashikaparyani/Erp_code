export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const [
      receivableAging,
      estimateStats,
      proformaStats,
      invoiceStats,
      receiptStats,
      followUpStats,
    ] = await Promise.all([
      callFrappeMethod('get_receivable_aging', undefined, request),
      callFrappeMethod('get_estimate_stats', undefined, request),
      callFrappeMethod('get_proforma_invoice_stats', undefined, request),
      callFrappeMethod('get_invoice_stats', undefined, request),
      callFrappeMethod('get_payment_receipt_stats', undefined, request),
      callFrappeMethod('get_payment_follow_up_stats', undefined, request),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        receivable_aging: receivableAging.data || [],
        estimate_stats: estimateStats.data || {},
        proforma_stats: proformaStats.data || {},
        invoice_stats: invoiceStats.data || {},
        receipt_stats: receiptStats.data || {},
        follow_up_stats: followUpStats.data || {},
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch commercial dashboard data');
  }
}
