import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    // No singular get_payment_follow_up method exists; filter from list
    const result = await callFrappeMethod('get_payment_follow_ups', {}, request);
    const list = Array.isArray(result?.data) ? result.data : [];
    const record = list.find((r: { name: string }) => r.name === name);
    if (!record) {
      return NextResponse.json({ success: false, message: 'Follow-up not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load follow-up');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await callFrappeMethod('update_payment_follow_up', { name: decodeURIComponent(id), data: JSON.stringify(body) }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to update follow-up');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('delete_payment_follow_up', { name: decodeURIComponent(id) }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to delete follow-up');
  }
}
