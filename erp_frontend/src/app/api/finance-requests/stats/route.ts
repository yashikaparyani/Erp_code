import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_finance_request_stats', {}, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    console.error('Error fetching finance stats:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch finance stats', data: {} },
      { status: 500 }
    );
  }
}
