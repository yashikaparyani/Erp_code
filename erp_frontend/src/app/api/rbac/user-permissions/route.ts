export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user') || undefined;

    const result = await callRbacMethod('get_user_effective_permissions', { user }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch permissions' },
      { status: 500 },
    );
  }
}
