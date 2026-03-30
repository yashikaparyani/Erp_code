import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod(
      'get_rma_trackers',
      {
        project: searchParams.get('project') || '',
        status: searchParams.get('status') || '',
        ticket: searchParams.get('ticket') || '',
      },
      request,
    );

    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch RMA trackers', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_rma_tracker', { data: JSON.stringify(data) }, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'RMA tracker created',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create RMA tracker' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'approve') {
      const result = await callFrappeMethod('approve_rma', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'RMA approved' });
    }
    if (action === 'reject') {
      const result = await callFrappeMethod('reject_rma', { name, reason: rest.reason || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'RMA rejected' });
    }
    if (action === 'close') {
      const result = await callFrappeMethod('close_rma', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'RMA closed' });
    }
    if (action === 'status') {
      const result = await callFrappeMethod('update_rma_status', { name, new_status: rest.new_status || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'RMA status updated' });
    }
    if (action === 'submit_to_ph') {
      const result = await callFrappeMethod('submit_rma_po_to_ph', { name, remarks: rest.remarks || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'RMA PO submitted to Project Head for approval' });
    }

    return NextResponse.json({ success: false, message: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update RMA' },
      { status: 500 }
    );
  }
}
