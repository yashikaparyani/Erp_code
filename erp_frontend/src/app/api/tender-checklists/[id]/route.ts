import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('delete_tender_checklist', {
      name: decodeURIComponent(id),
    }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Checklist deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete checklist' },
      { status: 500 }
    );
  }
}
