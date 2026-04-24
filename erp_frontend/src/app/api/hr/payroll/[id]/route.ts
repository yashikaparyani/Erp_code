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
    const result = await callFrappeMethod('get_salary_slip', { name }, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch salary slip');
  }
}
