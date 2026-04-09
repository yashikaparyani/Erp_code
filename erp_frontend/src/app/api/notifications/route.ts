import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_notification_center', {}, request);
    return NextResponse.json({ success: true, data: result?.data ?? result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load notifications');
  }
}
