import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const drawingName = decodeURIComponent(id);
    const result = await callFrappeMethod('get_drawing', { name: drawingName }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch drawing' },
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
    const drawingName = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod('update_drawing', {
      name: drawingName,
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Drawing updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update drawing' },
      { status: 500 },
    );
  }
}
