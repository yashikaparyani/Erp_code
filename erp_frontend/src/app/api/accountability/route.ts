import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

function addOptionalArg(args: Record<string, string>, key: string, value: string | null) {
  if (value) {
    args[key] = value;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = (searchParams.get('mode') || 'timeline').trim().toLowerCase();
    const args: Record<string, string> = {};
    let methodName = '';

    if (mode === 'timeline' || mode === 'record') {
      const subjectDoctype = searchParams.get('subject_doctype') || '';
      const subjectName = searchParams.get('subject_name') || '';

      if (!subjectDoctype || !subjectName) {
        return NextResponse.json(
          { success: false, message: 'subject_doctype and subject_name are required' },
          { status: 400 },
        );
      }

      args.subject_doctype = subjectDoctype;
      args.subject_name = subjectName;
      methodName = mode === 'record' ? 'get_accountability_record' : 'get_accountability_timeline';
    } else if (mode === 'open') {
      methodName = 'get_open_accountability_items';
      addOptionalArg(args, 'project', searchParams.get('project'));
      addOptionalArg(args, 'site', searchParams.get('site'));
      addOptionalArg(args, 'owner_user', searchParams.get('owner_user'));
      addOptionalArg(args, 'blocked_only', searchParams.get('blocked_only'));
      addOptionalArg(args, 'escalated_only', searchParams.get('escalated_only'));
      addOptionalArg(args, 'subject_doctype', searchParams.get('subject_doctype'));
      addOptionalArg(args, 'limit', searchParams.get('limit'));
    } else if (mode === 'overdue') {
      methodName = 'get_overdue_accountability_items';
      addOptionalArg(args, 'project', searchParams.get('project'));
      addOptionalArg(args, 'site', searchParams.get('site'));
      addOptionalArg(args, 'limit', searchParams.get('limit'));
    } else if (mode === 'blocked') {
      methodName = 'get_blocked_accountability_items';
      addOptionalArg(args, 'project', searchParams.get('project'));
      addOptionalArg(args, 'site', searchParams.get('site'));
      addOptionalArg(args, 'limit', searchParams.get('limit'));
    } else if (mode === 'events') {
      methodName = 'get_accountability_events_by_project';
      addOptionalArg(args, 'project', searchParams.get('project'));
      addOptionalArg(args, 'event_type', searchParams.get('event_type'));
      addOptionalArg(args, 'limit', searchParams.get('limit'));
    } else if (mode === 'dashboard') {
      methodName = 'get_accountability_dashboard_summary';
      addOptionalArg(args, 'project', searchParams.get('project'));
      addOptionalArg(args, 'site', searchParams.get('site'));
      addOptionalArg(args, 'department', searchParams.get('department'));
    } else {
      return NextResponse.json(
        { success: false, message: `Unknown mode: ${mode}` },
        { status: 400 },
      );
    }

    const result = await callFrappeMethod(methodName, args, request);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Accountability request failed',
      },
      { status: 500 },
    );
  }
}
