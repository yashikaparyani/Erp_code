import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const name = decodeURIComponent(params.id);
  try {
    const result = await callFrappeMethod('get_overtime_entry', { name }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Failed to load overtime entry' }, { status: 500 });
  }
}
