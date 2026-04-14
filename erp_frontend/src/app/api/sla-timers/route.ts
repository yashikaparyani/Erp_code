import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

type TimerRow = Record<string, any>;

async function enrichTimerRow(row: TimerRow, request: NextRequest): Promise<TimerRow> {
  try {
    const detail = await callFrappeMethod('get_sla_timer', { name: row.name }, request);
    const doc = detail?.data || detail;
    return {
      ...row,
      paused_intervals: doc?.paused_intervals || row.paused_intervals || '[]',
      linked_ticket: doc?.linked_ticket || row.linked_ticket,
      sla_profile: doc?.sla_profile || row.sla_profile,
    };
  } catch {
    return row;
  }
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_sla_timers', {
      ticket: sp.get('ticket') || '',
    }, request);
    const list = Array.isArray(result?.data) ? result.data : [];
    const enriched = await Promise.all(list.map((row: TimerRow) => enrichTimerRow(row, request)));
    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch SLA timers', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_sla_timer', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'SLA timer created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create SLA timer' },
      { status: 500 },
    );
  }
}
