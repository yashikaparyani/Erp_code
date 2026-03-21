import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('unread_only')) args.unread_only = sp.get('unread_only')!;
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('limit')) args.limit = sp.get('limit')!;
    const result = await callFrappeMethod('get_alerts', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch alerts', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alert_name } = body;

    if (action === 'mark_read' && alert_name) {
      const result = await callFrappeMethod('mark_alert_as_read', { alert_name }, request);
      return NextResponse.json(result);
    }

    if (action === 'mark_all_read') {
      const result = await callFrappeMethod('mark_all_alerts_read', {}, request);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update alert' },
      { status: 500 }
    );
  }
}
