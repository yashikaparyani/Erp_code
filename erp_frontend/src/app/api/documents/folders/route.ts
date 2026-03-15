import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await callFrappeMethod(
      'get_document_folders',
      {
        project: searchParams.get('project') || '',
        department: searchParams.get('department') || '',
        source: searchParams.get('source') || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching document folders:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch folders', data: [] },
      { status: 500 }
    );
  }
}
