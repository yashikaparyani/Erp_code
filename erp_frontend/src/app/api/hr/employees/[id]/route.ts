export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const result = await callFrappeMethod('get_employee', { name }, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch employee');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const body = await request.json();
    const result = await callFrappeMethod(
      'update_employee',
      { name, data: JSON.stringify(body) },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to update employee');
  }
}
