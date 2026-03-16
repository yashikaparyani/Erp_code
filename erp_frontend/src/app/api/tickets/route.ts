import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_tickets', {
      status: searchParams.get('status') || '',
      priority: searchParams.get('priority') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tickets', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_ticket', { data: JSON.stringify(data) }, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Ticket created',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create ticket' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'assign') {
      return NextResponse.json(await callFrappeMethod('assign_ticket', { name, assigned_to: rest.assigned_to || '' }, request));
    }
    if (action === 'escalate') {
      return NextResponse.json(await callFrappeMethod('escalate_ticket', { name, reason: rest.reason || '' }, request));
    }
    if (action === 'comment') {
      return NextResponse.json(await callFrappeMethod('add_ticket_comment', { name, notes: rest.notes || '', attachment: rest.attachment || '' }, request));
    }
    if (action === 'start') {
      return NextResponse.json(await callFrappeMethod('start_ticket', { name }, request));
    }
    if (action === 'pause') {
      return NextResponse.json(await callFrappeMethod('pause_ticket', { name, reason: rest.reason || '' }, request));
    }
    if (action === 'resume') {
      return NextResponse.json(await callFrappeMethod('resume_ticket', { name }, request));
    }
    if (action === 'resolve') {
      return NextResponse.json(await callFrappeMethod('resolve_ticket', { name, resolution_notes: rest.resolution_notes || '' }, request));
    }
    if (action === 'close') {
      return NextResponse.json(await callFrappeMethod('close_ticket', { name, closure_notes: rest.closure_notes || '' }, request));
    }

    return NextResponse.json({ success: false, message: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
