export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_tender_reminder', {
      name: decodeURIComponent(id),
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch reminder' },
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
    const body = await request.json();
    const result = await callFrappeMethod('update_tender_reminder', {
      name: decodeURIComponent(id),
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Reminder updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update reminder' },
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
    const result = await callFrappeMethod('delete_tender_reminder', {
      name: decodeURIComponent(id),
    }, request);
    return NextResponse.json({ success: true, message: result.message || 'Reminder deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete reminder' },
      { status: 500 },
    );
  }
}
