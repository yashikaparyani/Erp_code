import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.user || !body.pack_key || !body.grant_or_revoke) {
      return NextResponse.json(
        { success: false, message: 'user, pack_key, and grant_or_revoke are required' },
        { status: 400 },
      );
    }
    const result = await callRbacMethod('assign_user_override', body, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to save override' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const override_name = searchParams.get('name');
    if (!override_name) {
      return NextResponse.json({ success: false, message: 'name is required' }, { status: 400 });
    }
    const result = await callRbacMethod('remove_user_override', { override_name }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to remove override' },
      { status: 500 },
    );
  }
}
