import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deviationName = decodeURIComponent(id);
    const body = await request.json();
    const { action, ...rest } = body;

    const actionMap: Record<string, { method: string; message: string }> = {
      approve: { method: 'approve_technical_deviation', message: 'Deviation approved' },
      reject: { method: 'reject_technical_deviation', message: 'Deviation rejected' },
      close: { method: 'close_technical_deviation', message: 'Deviation closed' },
    };

    const entry = actionMap[action];
    if (!entry) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const result = await callFrappeMethod(entry.method, {
      name: deviationName,
      ...(action === 'reject' ? { reason: rest.reason || '' } : {}),
    }, request);

    return NextResponse.json({ success: true, data: result.data, message: entry.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 },
    );
  }
}
