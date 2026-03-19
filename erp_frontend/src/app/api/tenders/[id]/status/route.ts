import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const body = await request.json();
    const targetStatus = String(body?.target_status || '').trim().toUpperCase();

    if (!targetStatus) {
      return NextResponse.json({ success: false, message: 'target_status is required' }, { status: 400 });
    }

    const result = await callFrappeMethod('transition_tender_status', {
      name: tenderName,
      target_status: targetStatus,
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || `Tender moved to ${targetStatus}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update tender status' },
      { status: 500 },
    );
  }
}
