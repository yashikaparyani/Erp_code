import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';
    const designation = searchParams.get('designation') || '';
    const branch = searchParams.get('branch') || '';
    const search = searchParams.get('search') || '';

    const result = await callFrappeMethod(
      'get_employees',
      { status, department, designation, branch, search },
      request,
    );

    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch employees', data: [] },
      { status: 500 },
    );
  }
}
