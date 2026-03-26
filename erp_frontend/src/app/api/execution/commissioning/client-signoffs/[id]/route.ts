import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const result = await callFrappeMethod('get_client_signoff', { name }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch client signoff' },
      { status: 500 },
    );
  }
}
