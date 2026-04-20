export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, callRbacMethod } from '../../_lib/frappe';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const firstName = (body.first_name || body.name || '').trim();
    const password = body.password || '';

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }
    if (!firstName) {
      return NextResponse.json({ success: false, message: 'First name is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ success: false, message: 'Password is required' }, { status: 400 });
    }

    const createResult = await callFrappeMethod('create_user', {
      data: JSON.stringify({
        email,
        first_name: firstName,
        username: (body.username || '').trim() || undefined,
        password,
        contact_no: (body.contact_no || '').trim() || undefined,
        phone: (body.phone || '').trim() || undefined,
        mobile_no: (body.mobile_no || '').trim() || undefined,
      }),
    }, request);

    await callRbacMethod('update_user_context', {
      user: email,
      department: body.department || '',
      designation: body.designation || '',
      primary_role: body.primary_role || '',
      secondary_roles: body.secondary_roles || '',
      assigned_projects: body.assigned_projects || '',
      assigned_sites: body.assigned_sites || '',
      region: body.region || '',
      is_active: 1,
    }, request);

    return NextResponse.json({ success: true, data: createResult.data || createResult });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create RBAC user' },
      { status: 500 },
    );
  }
}
