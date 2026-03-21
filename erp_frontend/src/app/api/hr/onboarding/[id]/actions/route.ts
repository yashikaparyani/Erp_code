import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../../_lib/frappe';

const ACTION_METHODS: Record<string, string> = {
  submit: 'submit_onboarding',
  review: 'review_onboarding',
  send_back: 'return_onboarding_to_submitted',
  approve: 'approve_onboarding',
  reject: 'reject_onboarding',
  reopen: 'reopen_onboarding_draft',
  map: 'map_onboarding_to_employee',
};

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const method = ACTION_METHODS[action];

    if (!method) {
      return NextResponse.json({ success: false, message: 'Unsupported onboarding action' }, { status: 400 });
    }

    const args: Record<string, unknown> = { name: decodeURIComponent(id) };
    if (action === 'reject' && typeof body.reason === 'string') {
      args.reason = body.reason;
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to run onboarding action',
      },
      { status: 500 },
    );
  }
}
