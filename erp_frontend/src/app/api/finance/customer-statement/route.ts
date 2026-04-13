export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get('customer') || '';

    if (!customer) {
      return NextResponse.json({ success: false, message: 'customer parameter is required' }, { status: 400 });
    }

    const result = await callFrappeMethod('get_customer_statement', { customer }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch customer statement');
  }
}
