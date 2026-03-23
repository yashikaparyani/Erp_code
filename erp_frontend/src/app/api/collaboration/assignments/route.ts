import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('reference_doctype')) args.reference_doctype = sp.get('reference_doctype')!;
    if (sp.get('reference_name')) args.reference_name = sp.get('reference_name')!;
    const result = await callFrappeMethod('get_record_assignments', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch assignments', data: [] },
      { status: 500 }
    );
  }
}
