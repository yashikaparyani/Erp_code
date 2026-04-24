import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    const result = await callFrappeMethod('get_suppliers', { q, limit: 100 }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch suppliers', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'update') {
      const result = await callFrappeMethod('update_supplier', { name, data: JSON.stringify(rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Supplier updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_supplier', { name }, request);
      return NextResponse.json({ success: true, message: result.message || 'Supplier deleted' });
    }
    // create
    const result = await callFrappeMethod('create_supplier', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Supplier created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
