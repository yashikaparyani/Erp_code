import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (action !== 'release') {
      return NextResponse.json({ success: false, message: 'Unsupported retention action' }, { status: 400 });
    }

    const args: Record<string, unknown> = { name: decodeURIComponent(id) };
    if (body.release_amount != null) {
      args.release_amount = body.release_amount;
    }

    const result = await callFrappeMethod('release_retention', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to run retention action');
  }
}
