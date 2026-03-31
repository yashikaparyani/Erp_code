import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await callPresalesMethod(
      'send_loi_request_to_departments',
      {
        name: decodeURIComponent(id),
        loi_expected_by: body.loi_expected_by || '',
        remarks: body.remarks || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'LOI request sent' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to send LOI request' },
      { status: 500 },
    );
  }
}
