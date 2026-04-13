export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || '';

    const args: Record<string, string> = {};
    if (project) args.project = project;

    const result = await callFrappeMethod('get_payment_receipt_stats', args, request);
    return NextResponse.json({ success: true, data: result.data || {} });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch payment receipt stats');
  }
}
