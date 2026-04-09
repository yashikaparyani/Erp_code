import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/commercial?type=documents|comments&customer=...&reference_doctype=...&reference_name=...
 * Typed wrapper for commercial document and comment reads.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const type = sp.get('type') || 'documents';

    if (type === 'comments') {
      const args: Record<string, string> = {};
      if (sp.get('customer')) args.customer = sp.get('customer')!;
      if (sp.get('reference_doctype')) args.reference_doctype = sp.get('reference_doctype')!;
      if (sp.get('reference_name')) args.reference_name = sp.get('reference_name')!;
      const result = await callFrappeMethod('get_commercial_comments', args, request);
      return NextResponse.json({ success: true, data: result.data ?? result ?? [] });
    }

    if (type === 'documents') {
      const args: Record<string, string> = {};
      if (sp.get('customer')) args.customer = sp.get('customer')!;
      if (sp.get('category')) args.category = sp.get('category')!;
      const result = await callFrappeMethod('get_commercial_documents', args, request);
      return NextResponse.json({ success: true, data: result.data ?? result ?? [] });
    }

    return NextResponse.json({ success: false, message: `Invalid type: ${type}` }, { status: 400 });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch commercial data');
  }
}

/**
 * POST /api/commercial
 * Body: { action: 'create_document' | 'add_comment', ...fields }
 * Typed wrapper for commercial document/comment writes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...fields } = body;

    if (action === 'add_comment') {
      const { reference_doctype, reference_name, content } = fields;
      if (!reference_doctype || !reference_name || !content) {
        return NextResponse.json({ success: false, message: 'reference_doctype, reference_name, and content are required' }, { status: 400 });
      }
      const result = await callFrappeMethod('add_commercial_comment', { reference_doctype, reference_name, content }, request);
      return NextResponse.json({ success: true, data: result.data ?? result, message: 'Comment added' });
    }

    if (action === 'create_document') {
      const result = await callFrappeMethod('create_commercial_document', fields, request);
      return NextResponse.json({ success: true, data: result.data ?? result, message: 'Document created' });
    }

    return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to perform commercial operation');
  }
}
