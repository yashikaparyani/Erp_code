import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('from_date')) args.from_date = sp.get('from_date')!;
    if (sp.get('to_date')) args.to_date = sp.get('to_date')!;

    const result = await callFrappeMethod('get_sales_mis', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load sales MIS');
  }
}
