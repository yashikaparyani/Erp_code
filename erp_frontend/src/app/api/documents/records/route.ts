export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference_doctype = searchParams.get('reference_doctype') || '';
    const reference_name = searchParams.get('reference_name') || '';

    const result = await callFrappeMethod('get_record_documents', { reference_doctype, reference_name }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to load record documents' },
      { status: 500 },
    );
  }
}
