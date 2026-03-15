import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_users', {}, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch users', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('create_user', {
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    );
  }
}
