import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/indents/[id] — fetch a single indent with full detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod('get_indent', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data ?? result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch indent');
  }
}

/**
 * POST /api/indents/[id] — perform workflow actions on an indent
 * Body: { action: 'submit' | 'acknowledge' | 'accept' | 'reject' | 'return' | 'escalate', remarks?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const body = await request.json();
    const { action, remarks } = body;

    const methodMap: Record<string, string> = {
      submit: 'submit_indent',
      acknowledge: 'acknowledge_indent',
      accept: 'accept_indent',
      reject: 'reject_indent',
      return: 'return_indent',
      escalate: 'escalate_indent',
    };

    const method = methodMap[action];
    if (!method) {
      return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
    }

    const args: Record<string, string> = { name };
    if (remarks) args.remarks = remarks;

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json({
      success: true,
      data: result.data ?? result,
      message: result.message || `Indent ${action} completed`,
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to perform indent action');
  }
}
