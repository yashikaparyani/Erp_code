import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || '';
    if (!name) {
      return NextResponse.json({ success: false, message: 'name is required', data: [] }, { status: 400 });
    }
    const result = await callFrappeMethod('get_document_versions', { name }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch versions', data: [] },
      { status: 500 }
    );
  }
}
