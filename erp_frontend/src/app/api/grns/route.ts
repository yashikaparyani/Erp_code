import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod(
      'get_grns',
      {
        project: searchParams.get('project') || '',
        status: searchParams.get('status') || '',
        supplier: searchParams.get('supplier') || '',
        purchase_order: searchParams.get('purchase_order') || '',
        limit_page_length: searchParams.get('limit_page_length') || '50',
        limit_start: searchParams.get('limit_start') || '0',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch GRNs', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_grn', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'GRN created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create GRN' },
      { status: 500 },
    );
  }
}