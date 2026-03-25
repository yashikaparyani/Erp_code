import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await callPresalesMethod(
      'submit_loc_by_project_head',
      {
        name: params.id,
        submission_date: body.submission_date,
        remarks: body.remarks || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to submit LOC' },
      { status: 500 },
    );
  }
}
