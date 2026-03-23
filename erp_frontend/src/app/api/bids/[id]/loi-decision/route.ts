import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await callPresalesMethod(
      'decide_won_bid_loi',
      {
        name: decodeURIComponent(id),
        decision: body.decision,
        reason: body.reason || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'LOI decision saved' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to save LOI decision' },
      { status: 500 },
    );
  }
}
