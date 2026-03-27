import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_petty_cash_entry', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch petty cash entry' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const { action, reason } = await request.json();

    let result;
    if (action === 'approve') {
      result = await callFrappeMethod('approve_petty_cash_entry', { name }, request);
    } else if (action === 'reject') {
      result = await callFrappeMethod('reject_petty_cash_entry', { name, reason: reason || '' }, request);
    } else {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result?.data, message: result?.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 },
    );
  }
}
