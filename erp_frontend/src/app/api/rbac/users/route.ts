export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const role = searchParams.get('role') || undefined;
    const is_active = searchParams.get('is_active') ?? '1';

    const result = await callRbacMethod('get_rbac_users', {
      department,
      role,
      is_active,
    }, request);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch RBAC users' },
      { status: 500 },
    );
  }
}
