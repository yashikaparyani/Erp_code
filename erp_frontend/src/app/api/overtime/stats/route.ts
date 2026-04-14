export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_overtime_stats', {}, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load overtime stats');
  }
}
