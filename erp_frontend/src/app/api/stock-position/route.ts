import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod(
      'get_stock_position',
      {
        warehouse: searchParams.get('warehouse') || '',
        item_code: searchParams.get('item_code') || '',
        limit_page_length: searchParams.get('limit_page_length') || '50',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch stock position', data: [] },
      { status: 500 },
    );
  }
}