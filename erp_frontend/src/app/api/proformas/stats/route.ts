import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_proforma_invoice_stats', {}, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load proforma stats');
  }
}
