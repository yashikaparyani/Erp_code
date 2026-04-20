import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_material_receipt', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data ?? result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch GRN');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;
    const name = decodeURIComponent(id);

    let result;
    if (action === 'submit') {
      result = await callFrappeMethod('submit_material_receipt', { name }, request);
    } else if (action === 'approve') {
      result = await callFrappeMethod('approve_material_receipt', { name }, request);
    } else if (action === 'reject') {
      result = await callFrappeMethod('reject_material_receipt', { name, reason: body.reason || '' }, request);
    } else if (action === 'update') {
      result = await callFrappeMethod('update_material_receipt', { name, data: JSON.stringify(body.data || {}) }, request);
    } else {
      return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return jsonErrorResponse(error, 'Action failed');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('delete_material_receipt', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to delete GRN');
  }
}
