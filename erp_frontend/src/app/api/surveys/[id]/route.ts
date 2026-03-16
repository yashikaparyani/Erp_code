import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyName = decodeURIComponent(id);
    const result = await callFrappeMethod('get_survey', { name: surveyName }, request);

    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch survey' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyName = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod('update_survey', {
      name: surveyName,
      data: JSON.stringify(body),
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Survey updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update survey' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyName = decodeURIComponent(id);
    const result = await callFrappeMethod('delete_survey', { name: surveyName }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Survey deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete survey' },
      { status: 500 },
    );
  }
}
