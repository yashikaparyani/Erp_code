import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_client_signoffs', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch client signoffs', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'sign') {
      const result = await callFrappeMethod('sign_client_signoff', { name, signed_by_client: rest.signed_by_client || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Client signoff signed' });
    }
    if (action === 'approve') {
      const result = await callFrappeMethod('approve_client_signoff', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Client signoff approved' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_client_signoff', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Client signoff updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_client_signoff', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Client signoff deleted' });
    }

    const result = await callFrappeMethod('create_client_signoff', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Client signoff created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
