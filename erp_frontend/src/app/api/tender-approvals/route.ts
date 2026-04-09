export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod(
      'get_tender_approvals',
      {
        tender: searchParams.get('tender') || '',
        status: searchParams.get('status') || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tender approvals', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod(
      'submit_tender_approval',
      {
        name: body.name,
        approval_type: body.approval_type,
        remarks: body.remarks || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender approval submitted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to submit tender approval' },
      { status: 500 },
    );
  }
}
