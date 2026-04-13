import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../../_lib/frappe';

const ACTION_METHODS: Record<string, string> = {
  close: 'close_payment_follow_up',
  escalate: 'escalate_payment_follow_up',
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const method = ACTION_METHODS[action];

    if (!method) {
      return NextResponse.json({ success: false, message: 'Unsupported follow-up action' }, { status: 400 });
    }

    const args: Record<string, unknown> = { name: decodeURIComponent(id) };
    for (const key of ['remarks', 'collected_amount', 'escalate_to']) {
      if (body[key] !== undefined) args[key] = body[key];
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to run follow-up action');
  }
}
