import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'generate') {
      const result = await callFrappeMethod('generate_system_reminders', {}, request);
      return NextResponse.json(result);
    }

    if (action === 'process_due') {
      const result = await callFrappeMethod('process_due_reminders', {}, request);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, message: 'Unsupported reminder action' }, { status: 400 });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to run reminder action');
  }
}
