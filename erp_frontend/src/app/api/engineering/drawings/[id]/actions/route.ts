import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const drawingName = decodeURIComponent(id);
    const body = await request.json();
    const { action, ...rest } = body;

    const actionMap: Record<string, { method: string; message: string }> = {
      submit: { method: 'submit_drawing', message: 'Drawing submitted for approval' },
      approve: { method: 'approve_drawing', message: 'Drawing approved' },
      supersede: { method: 'supersede_drawing', message: 'Drawing superseded' },
    };

    const entry = actionMap[action];
    if (!entry) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const result = await callFrappeMethod(entry.method, {
      name: drawingName,
      ...(action === 'supersede' ? { superseded_by: rest.superseded_by || '' } : {}),
    }, request);

    return NextResponse.json({ success: true, data: result.data, message: entry.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 },
    );
  }
}
