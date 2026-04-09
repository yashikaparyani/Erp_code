export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const args: Record<string, string> = {};
    for (const key of [
      'event_type', 'target_user', 'target_role', 'target_pack',
      'actor', 'from_date', 'to_date', 'limit_page_length', 'limit_start',
    ]) {
      const v = searchParams.get(key);
      if (v) args[key] = v;
    }
    const result = await callRbacMethod('get_rbac_audit_log', args, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch audit log' },
      { status: 500 },
    );
  }
}
