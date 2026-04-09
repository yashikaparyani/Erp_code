export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../_lib/frappe';

// GET /api/bids?tender=X&status=X&is_latest=1
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const result = await callPresalesMethod('get_bids', {
      tender: sp.get('tender') || undefined,
      status: sp.get('status') || undefined,
      is_latest: sp.get('is_latest') || undefined,
      loi_decision_status: sp.get('loi_decision_status') || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch bids', data: [] },
      { status: 500 }
    );
  }
}

// POST /api/bids  — create bid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callPresalesMethod('create_bid', {
      tender: body.tender,
      bid_amount: body.bid_amount || 0,
      bid_date: body.bid_date || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create bid' },
      { status: 500 }
    );
  }
}
