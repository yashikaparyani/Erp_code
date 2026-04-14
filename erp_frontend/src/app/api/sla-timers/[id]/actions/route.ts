import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

const ACTION_METHODS: Record<string, string> = {
  pause: 'pause_sla_timer',
  resume: 'resume_sla_timer',
  close: 'close_sla_timer',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();
    const method = ACTION_METHODS[action];

    if (!method) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const args: Record<string, any> = { name };
    if (action === 'close') {
      if (body?.response_met !== undefined) args.response_met = body.response_met;
      if (body?.resolution_met !== undefined) args.resolution_met = body.resolution_met;
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'SLA timer action completed' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to run SLA timer action' },
      { status: 500 },
    );
  }
}
