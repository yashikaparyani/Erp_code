import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_departments', {}, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch departments', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.department_name) {
      return NextResponse.json({ success: false, message: 'Department name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('create_department', {
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create department' },
      { status: 500 }
    );
  }
}
