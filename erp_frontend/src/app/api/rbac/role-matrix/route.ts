import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callRbacMethod('get_role_pack_matrix', {}, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch role matrix' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.role) {
      return NextResponse.json({ success: false, message: 'role is required' }, { status: 400 });
    }
    const result = await callRbacMethod('assign_role_packs', {
      role: body.role,
      packs: JSON.stringify(body.packs || []),
    }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update role packs' },
      { status: 500 },
    );
  }
}
