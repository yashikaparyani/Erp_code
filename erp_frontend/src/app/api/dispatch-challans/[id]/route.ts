import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const challanName = decodeURIComponent(id);
    const result = await callFrappeMethod('get_dispatch_challan', { name: challanName }, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch dispatch challan' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const challanName = decodeURIComponent(id);
    const data = await request.json();
    const result = await callFrappeMethod('update_dispatch_challan', {
      name: challanName,
      data: JSON.stringify(data),
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update dispatch challan' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const challanName = decodeURIComponent(id);
    const result = await callFrappeMethod('delete_dispatch_challan', { name: challanName }, request);
    return NextResponse.json({ success: true, message: result.message || 'Deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete dispatch challan' },
      { status: 500 },
    );
  }
}
