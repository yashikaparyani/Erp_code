import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deviationName = decodeURIComponent(id);
    const result = await callFrappeMethod('get_technical_deviation', { name: deviationName }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch deviation' },
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
    const deviationName = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod('update_technical_deviation', {
      name: deviationName,
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Deviation updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update deviation' },
      { status: 500 },
    );
  }
}
