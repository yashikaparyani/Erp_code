import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const result = await callFrappeMethod('get_tender', { name: tenderName }, request);
    
    return NextResponse.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('Error fetching tender:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tender' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod('update_tender', {
      name: tenderName,
      data: JSON.stringify(body),
    }, request);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Tender updated successfully'
    });
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update tender' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const result = await callFrappeMethod('delete_tender', { name: tenderName }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Tender deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tender:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete tender' },
      { status: 500 }
    );
  }
}
