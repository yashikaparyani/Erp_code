import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_pending_approvals', {}, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch approvals', data: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { kind, action, name, reason } = body;

    if (kind === 'vendor_comparison' && action === 'approve') {
      const result = await callFrappeMethod('approve_vendor_comparison', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Approved' });
    }
    if (kind === 'vendor_comparison' && action === 'reject') {
      const result = await callFrappeMethod('reject_vendor_comparison', { name, reason: reason || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: result.message || 'Rejected' });
    }

    return NextResponse.json({ success: false, message: 'Unsupported approval action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: 500 }
    );
  }
}
