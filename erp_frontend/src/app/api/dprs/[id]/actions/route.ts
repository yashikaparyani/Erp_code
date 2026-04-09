import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

const DPR_ACTIONS = new Set(['submit_dpr', 'approve_dpr', 'reject_dpr']);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body?.action || '').trim();

    if (!action || !DPR_ACTIONS.has(action)) {
      return NextResponse.json(
        { success: false, message: `Invalid DPR action: ${action}` },
        { status: 400 },
      );
    }

    const result = await callFrappeMethod(action, {
      name: decodeURIComponent(id),
      ...(body.remarks ? { remarks: body.remarks } : {}),
    }, request);

    return NextResponse.json({ success: true, data: result?.data ?? result, message: result?.message || 'Action completed' });
  } catch (error) {
    return jsonErrorResponse(error, 'DPR action failed');
  }
}
