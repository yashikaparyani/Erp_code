import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../../../_lib/frappe';

const ACTION_METHODS: Record<string, string> = {
  submit: 'submit_leave_application',
  approve: 'approve_leave_application',
  reject: 'reject_leave_application',
  reopen: 'reopen_leave_application',
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const method = ACTION_METHODS[action];

    if (!method) {
      return NextResponse.json({ success: false, message: 'Unsupported leave action' }, { status: 400 });
    }

    const args: Record<string, unknown> = { name: decodeURIComponent(id) };
    if (action === 'reject' && typeof body.reason === 'string') {
      args.reason = body.reason;
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to run leave action');
  }
}
