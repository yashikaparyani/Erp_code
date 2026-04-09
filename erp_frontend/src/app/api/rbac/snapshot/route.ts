export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callRbacMethod('create_permission_snapshot', {
      user: body.user || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create snapshot' },
      { status: 500 },
    );
  }
}
