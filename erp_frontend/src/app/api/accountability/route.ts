import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/accountability
 *
 * Modes (via query param ?mode=...):
 *   (none / timeline)  ?subject_doctype=X&subject_name=Y
 *                      → get_accountability_timeline
 *   ?mode=record       ?subject_doctype=X&subject_name=Y
 *                      → get_accountability_record
 *   ?mode=open         ?project=X&site=Y&owner_user=Z&blocked_only=1&escalated_only=1&subject_doctype=T&limit=N
 *                      → get_open_accountability_items
 *   ?mode=overdue      ?project=X&site=Y&limit=N
 *                      → get_overdue_accountability_items
 *   ?mode=blocked      ?project=X&site=Y&limit=N
 *                      → get_blocked_accountability_items
 *   ?mode=events       ?project=X&event_type=T&limit=N
 *                      → get_accountability_events_by_project
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const mode = sp.get('mode') ?? 'timeline';

    if (mode === 'timeline' || mode === 'record') {
      const subject_doctype = sp.get('subject_doctype') ?? '';
      const subject_name = sp.get('subject_name') ?? '';
      if (!subject_doctype || !subject_name) {
        return NextResponse.json(
          { success: false, message: 'subject_doctype and subject_name are required' },
          { status: 400 },
        );
      }

      const frappe_method =
        mode === 'record' ? 'get_accountability_record' : 'get_accountability_timeline';
      const result = await callFrappeMethod(
        frappe_method,
        { subject_doctype, subject_name },
        request,
      );
      return NextResponse.json(result);
    }

    if (mode === 'open') {
      const args: Record<string, string> = {};
      if (sp.get('project')) args.project = sp.get('project')!;
      if (sp.get('site')) args.site = sp.get('site')!;
      if (sp.get('owner_user')) args.owner_user = sp.get('owner_user')!;
      if (sp.get('blocked_only')) args.blocked_only = sp.get('blocked_only')!;
      if (sp.get('escalated_only')) args.escalated_only = sp.get('escalated_only')!;
      if (sp.get('subject_doctype')) args.subject_doctype = sp.get('subject_doctype')!;
      if (sp.get('limit')) args.limit = sp.get('limit')!;
      const result = await callFrappeMethod('get_open_accountability_items', args, request);
      return NextResponse.json(result);
    }

    if (mode === 'overdue') {
      const args: Record<string, string> = {};
      if (sp.get('project')) args.project = sp.get('project')!;
      if (sp.get('site')) args.site = sp.get('site')!;
      if (sp.get('limit')) args.limit = sp.get('limit')!;
      const result = await callFrappeMethod('get_overdue_accountability_items', args, request);
      return NextResponse.json(result);
    }

    if (mode === 'blocked') {
      const args: Record<string, string> = {};
      if (sp.get('project')) args.project = sp.get('project')!;
      if (sp.get('site')) args.site = sp.get('site')!;
      if (sp.get('limit')) args.limit = sp.get('limit')!;
      const result = await callFrappeMethod('get_blocked_accountability_items', args, request);
      return NextResponse.json(result);
    }

    if (mode === 'events') {
      const args: Record<string, string> = {};
      if (sp.get('project')) args.project = sp.get('project')!;
      if (sp.get('event_type')) args.event_type = sp.get('event_type')!;
      if (sp.get('limit')) args.limit = sp.get('limit')!;
      const result = await callFrappeMethod('get_accountability_events_by_project', args, request);
      return NextResponse.json(result);
    }

    if (mode === 'dashboard') {
      const args: Record<string, string> = {};
      if (sp.get('project')) args.project = sp.get('project')!;
      if (sp.get('site')) args.site = sp.get('site')!;
      if (sp.get('department')) args.department = sp.get('department')!;
      const result = await callFrappeMethod('get_accountability_dashboard_summary', args, request);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: `Unknown mode: ${mode}` },
      { status: 400 },
    );
  } catch (error) {
    return jsonErrorResponse(error, 'Accountability request failed');
  }
}
