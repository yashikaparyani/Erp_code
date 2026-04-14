import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_payment_follow_up_stats', {}, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load follow-up stats');
  }
}
