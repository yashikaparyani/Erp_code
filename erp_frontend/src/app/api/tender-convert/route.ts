import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tender_name } = body;
    if (!tender_name) {
      return NextResponse.json({ success: false, message: 'tender_name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('convert_tender_to_project', { tender_name }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender converted to project' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to convert tender' },
      { status: 500 },
    );
  }
}
