import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_vendor_comparison', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data ?? result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch vendor comparison');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod('update_vendor_comparison', { name, data: body }, request);
    return NextResponse.json({ success: true, data: result.data ?? result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to update vendor comparison');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('delete_vendor_comparison', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, message: result.message || 'Vendor comparison deleted' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to delete vendor comparison');
  }
}
