export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '@/app/api/_lib/frappe';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const name = decodeURIComponent(params.id);
  try {
    const result = await callFrappeMethod('get_travel_log', { name }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Failed to load travel log' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const name = decodeURIComponent(params.id);
    const body = await request.json();
    const result = await callFrappeMethod(
      'update_travel_log',
      { name, data: JSON.stringify(body) },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Travel log updated' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to update travel log');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const name = decodeURIComponent(params.id);
    const result = await callFrappeMethod('delete_travel_log', { name }, request);
    return NextResponse.json({ success: true, data: result.data || null, message: result.message || 'Travel log deleted' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to delete travel log');
  }
}
