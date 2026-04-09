import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/project-inventory?project=...&type=records|consumption|summary|indents
 * Typed wrapper for project-inventory read operations.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const project = sp.get('project') || '';
    const type = sp.get('type') || 'records';

    const methodMap: Record<string, string> = {
      records: 'get_project_inventory_records',
      consumption: 'get_material_consumption_reports',
      summary: 'get_project_receiving_summary',
      indents: 'get_project_indents',
    };

    const method = methodMap[type];
    if (!method) {
      return NextResponse.json({ success: false, message: `Invalid type: ${type}` }, { status: 400 });
    }

    const args: Record<string, string> = { project };
    if (sp.get('limit_page_length')) args.limit_page_length = sp.get('limit_page_length')!;
    if (sp.get('limit_start')) args.limit_start = sp.get('limit_start')!;

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json({ success: true, data: result.data ?? result ?? [] });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch project inventory data');
  }
}

/**
 * POST /api/project-inventory
 * Body: { action: 'receipt' | 'consumption' | 'indent', data: {...} }
 * Typed wrapper for project-inventory write operations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const methodMap: Record<string, string> = {
      receipt: 'record_project_inventory_receipt',
      consumption: 'create_material_consumption_report',
      indent: 'create_project_indent',
    };

    const method = methodMap[action];
    if (!method) {
      return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await callFrappeMethod(method, data, request);
    return NextResponse.json({
      success: true,
      data: result.data ?? result,
      message: result.message || `${action} completed`,
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to perform inventory operation');
  }
}
