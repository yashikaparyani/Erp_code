import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    // ?count_missed=1 → return badge count of past-due reminders
    if (sp.get('count_missed') === '1') {
      const result = await callFrappeMethod('count_missed_reminders', {}, request);
      return NextResponse.json({ success: true, data: result?.data ?? { count: 0 } });
    }

    const args: Record<string, string> = {};
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('active_only')) args.active_only = sp.get('active_only')!;
    if (sp.get('limit')) args.limit = sp.get('limit')!;
    const result = await callFrappeMethod('get_reminders', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch reminders');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'create') {
      // shared_with is forwarded if provided
      const result = await callFrappeMethod('create_user_reminder', params, request);
      return NextResponse.json(result);
    }

    if (action === 'update') {
      const result = await callFrappeMethod('update_reminder', params, request);
      return NextResponse.json(result);
    }

    if (action === 'snooze') {
      const result = await callFrappeMethod('snooze_reminder', {
        reminder_name: params.reminder_name,
        minutes: params.minutes || 15,
      }, request);
      return NextResponse.json(result);
    }

    if (action === 'dismiss') {
      const result = await callFrappeMethod('dismiss_reminder', {
        reminder_name: params.reminder_name,
      }, request);
      return NextResponse.json(result);
    }

    if (action === 'delete') {
      const result = await callFrappeMethod('delete_reminder', {
        reminder_name: params.reminder_name,
      }, request);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return jsonErrorResponse(error, 'Reminder action failed');
  }
}
