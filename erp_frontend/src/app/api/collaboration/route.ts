import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('reference_doctype')) args.reference_doctype = sp.get('reference_doctype')!;
    if (sp.get('reference_name')) args.reference_name = sp.get('reference_name')!;
    if (sp.get('limit')) args.limit = sp.get('limit')!;
    const result = await callFrappeMethod('get_record_comments', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch comments', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'comment') {
      const result = await callFrappeMethod('add_record_comment', params, request);
      return NextResponse.json(result);
    }

    if (action === 'assign') {
      const result = await callFrappeMethod('assign_to_record', params, request);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to process collaboration action' },
      { status: 500 }
    );
  }
}
