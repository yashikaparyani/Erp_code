import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/closeout?project=...&type=eligibility|items
 * Typed wrapper for project closeout read operations.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const project = sp.get('project') || '';
    const type = sp.get('type') || 'items';

    if (!project) {
      return NextResponse.json({ success: false, message: 'project is required' }, { status: 400 });
    }

    if (type === 'eligibility') {
      const result = await callFrappeMethod('get_project_closeout_eligibility', { project }, request);
      return NextResponse.json({ success: true, data: result.data ?? result });
    }

    if (type === 'items') {
      const result = await callFrappeMethod('get_project_closeout_items', { project }, request);
      return NextResponse.json({ success: true, data: result.data ?? result ?? [] });
    }

    return NextResponse.json({ success: false, message: `Invalid type: ${type}` }, { status: 400 });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch closeout data');
  }
}

/**
 * POST /api/closeout
 * Body: { action: 'issue' | 'revoke' | 'complete_kt', ...fields }
 * Typed wrapper for closeout certificate actions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...fields } = body;

    if (action === 'issue') {
      const { project, closeout_type, remarks, kt_handover_plan } = fields;
      if (!project || !closeout_type) {
        return NextResponse.json({ success: false, message: 'project and closeout_type are required' }, { status: 400 });
      }
      const result = await callFrappeMethod('issue_closeout_certificate', {
        project, closeout_type, remarks: remarks || '', kt_handover_plan: kt_handover_plan || '',
      }, request);
      return NextResponse.json({ success: true, data: result.data ?? result, message: result.message || 'Certificate issued' });
    }

    if (action === 'revoke') {
      const { name, reason } = fields;
      if (!name) {
        return NextResponse.json({ success: false, message: 'name is required' }, { status: 400 });
      }
      const result = await callFrappeMethod('revoke_closeout_certificate', { name, reason: reason || '' }, request);
      return NextResponse.json({ success: true, data: result.data ?? result, message: result.message || 'Certificate revoked' });
    }

    if (action === 'complete_kt') {
      const { name } = fields;
      if (!name) {
        return NextResponse.json({ success: false, message: 'name is required' }, { status: 400 });
      }
      const result = await callFrappeMethod('complete_exit_management_kt', { name }, request);
      return NextResponse.json({ success: true, data: result.data ?? result, message: result.message || 'KT completed' });
    }

    return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to perform closeout operation');
  }
}
