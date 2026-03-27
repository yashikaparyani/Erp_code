import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_sla_penalty_records', {
      ticket: sp.get('ticket') || '',
      status: sp.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch SLA penalty records', data: [] },
      { status: 500 },
    );
  }
}
