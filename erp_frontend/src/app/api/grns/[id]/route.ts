import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_grn', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data ?? result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch GRN');
  }
}
