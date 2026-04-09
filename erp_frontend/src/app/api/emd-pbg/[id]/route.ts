export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callRawFrappeMethod } from '../../_lib/frappe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const result = await callRawFrappeMethod(
      `frappe.client.get?doctype=GE%20EMD%20PBG%20Instrument&name=${encodeURIComponent(name)}`,
      request,
      'GET',
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch instrument' },
      { status: 500 },
    );
  }
}
