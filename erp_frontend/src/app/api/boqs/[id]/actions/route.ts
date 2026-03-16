import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ACTION_TO_METHOD: Record<string, string> = {
  submit: 'submit_boq_for_approval',
  approve: 'approve_boq',
  reject: 'reject_boq',
  revise: 'revise_boq',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const boqName = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    const method = ACTION_TO_METHOD[action];
    if (!method) {
      return NextResponse.json(
        { success: false, message: `Unsupported action: ${action}` },
        { status: 400 },
      );
    }

    const args: Record<string, any> = { name: boqName };
    if (action === 'reject' && body?.reason) {
      args.reason = String(body.reason);
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || `BOQ ${action} successful`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'BOQ workflow action failed' },
      { status: 500 },
    );
  }
}
