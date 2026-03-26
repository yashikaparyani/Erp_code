import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const crName = decodeURIComponent(id);
    const result = await callFrappeMethod('get_change_request', { name: crName }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch change request' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const crName = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod('update_change_request', {
      name: crName,
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Change request updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update change request' },
      { status: 500 },
    );
  }
}
