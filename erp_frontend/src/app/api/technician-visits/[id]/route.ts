export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const name = decodeURIComponent(params.id);
  try {
    const result = await callFrappeMethod('get_technician_visit_log', { name }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Failed to load technician visit' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const name = decodeURIComponent(params.id);
  try {
    const data = await request.json();
    const result = await callFrappeMethod('update_technician_visit_log', { name, data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Technician visit updated' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Failed to update technician visit' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const name = decodeURIComponent(params.id);
  try {
    const result = await callFrappeMethod('delete_technician_visit_log', { name }, request);
    return NextResponse.json({ success: true, data: result.data || null, message: result.message || 'Technician visit deleted' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Failed to delete technician visit' }, { status: 500 });
  }
}
