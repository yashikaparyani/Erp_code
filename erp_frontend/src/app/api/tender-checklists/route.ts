export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_tender_checklists', {
      status: searchParams.get('status') || '',
      checklist_type: searchParams.get('checklist_type') || '',
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch checklists', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_tender_checklist', {
      data: JSON.stringify(data),
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Checklist created successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create checklist' },
      { status: 500 }
    );
  }
}
